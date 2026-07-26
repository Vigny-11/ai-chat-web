import { db } from '@/database/db'
import type { ChatMessage, Memory, MemoryCandidate } from '@/types'
import { createId, nowIso } from '@/utils/id'

const tokenize = (text: string) =>
  Array.from(new Set((text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []).slice(0, 80)))

export const findRelevantMemories = async (characterId: string, query: string, limit: number) => {
  const terms = tokenize(query)
  const memories = await db.memories
    .where('characterId')
    .equals(characterId)
    .filter((memory) => memory.enabled && memory.allowAIUse)
    .toArray()
  return memories
    .map((memory) => {
      const hay = `${memory.title} ${memory.content}`.toLowerCase()
      const matches = terms.filter((term) => hay.includes(term)).length
      const score = matches * 2 + memory.importance + (memory.pinned ? 8 : 0) + (Date.now() - new Date(memory.updatedAt).getTime() < 7 * 864e5 ? 1 : 0)
      return { memory, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory)
}

export const saveMemoryCandidates = async (
  characterId: string,
  conversationId: string,
  candidates: MemoryCandidate[],
  source?: ChatMessage,
) => {
  const existing = await db.memories.where('characterId').equals(characterId).toArray()
  const time = nowIso()
  const normalized = (text: string) => text.replace(/\s+/g, '').toLowerCase()
  const fresh: Memory[] = candidates
    .filter((item) => item.title?.trim() && item.content?.trim())
    .filter((item) => !existing.some((old) => normalized(old.content) === normalized(item.content)))
    .map((item) => ({
      id: createId('mem'),
      characterId,
      conversationId,
      type: item.type,
      title: item.title.slice(0, 60),
      content: item.content.slice(0, 500),
      importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
      createdAt: time,
      updatedAt: time,
      sourceMessageId: source?.id,
      pinned: false,
      enabled: true,
      allowAIUse: true,
    }))
  if (fresh.length) await db.memories.bulkAdd(fresh)
  return fresh
}
