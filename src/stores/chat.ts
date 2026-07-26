import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, createConversationForCharacter } from '@/database/db'
import { buildCharacterSystemPrompt } from '@/prompts/buildCharacterSystemPrompt'
import { openAICompatibleProvider } from '@/services/aiProvider'
import { findRelevantMemories, saveMemoryCandidates } from '@/services/memoryService'
import { useAppStore } from '@/stores/app'
import { useCharacterStore } from '@/stores/character'
import type { ChatMessage, Conversation, Memory } from '@/types'
import { createId, nowIso } from '@/utils/id'
import { extractAIContent, extractMessageText } from '@/utils/messageContent'

type RawChatMessage = Partial<ChatMessage> & {
  text?: unknown
  message?: unknown
  choices?: unknown
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const memories = ref<Memory[]>([])
  const activeConversationId = ref('')
  const generating = ref(false)
  const error = ref('')
  let controller: AbortController | null = null

  const normalizeMessage = (message: RawChatMessage | unknown, fallbackCharacterId = '', fallbackConversationId = ''): ChatMessage | null => {
    const raw = typeof message === 'object' && message ? (message as RawChatMessage) : ({ content: message } as RawChatMessage)
    const content = extractAIContent(raw.content ?? raw.text ?? raw.message ?? raw.choices ?? raw)
    const characterId = raw.characterId || fallbackCharacterId
    const conversationId = raw.conversationId || fallbackConversationId
    const role = raw.role === 'system' || raw.role === 'user' || raw.role === 'assistant' ? raw.role : 'assistant'
    if (!characterId || !conversationId || (!content && !raw.isGenerating)) return null
    return {
      ...raw,
      id: raw.id || createId('msg'),
      characterId,
      conversationId,
      role,
      content,
      createdAt: raw.createdAt || nowIso(),
      updatedAt: raw.updatedAt || nowIso(),
    }
  }

  const repairAllMessages = async () => {
    const allConversations = await db.conversations.toArray()
    const characterByConversation = new Map(allConversations.map((conversation) => [conversation.id, conversation.characterId]))
    const allMessages = await db.messages.toArray()
    const repaired: ChatMessage[] = []
    const invalidIds: string[] = []

    for (const message of allMessages) {
      const fallbackCharacterId = characterByConversation.get(message.conversationId) || ''
      const normalized = normalizeMessage(message, fallbackCharacterId, message.conversationId)
      if (!normalized || normalized.characterId !== fallbackCharacterId || !normalized.content) {
        invalidIds.push(message.id)
        continue
      }
      if (normalized.content !== message.content || normalized.characterId !== message.characterId || normalized.role !== message.role) {
        repaired.push(normalized)
      }
    }

    if (invalidIds.length) await db.messages.bulkDelete(invalidIds)
    if (repaired.length) await db.messages.bulkPut(repaired)
  }

  const loadForCharacter = async (characterId: string) => {
    await repairAllMessages()
    conversations.value = await db.conversations.where('characterId').equals(characterId).reverse().sortBy('updatedAt')
    memories.value = await db.memories.where('characterId').equals(characterId).toArray()
    const currentBelongsToCharacter = conversations.value.some((conversation) => conversation.id === activeConversationId.value)
    activeConversationId.value = currentBelongsToCharacter ? activeConversationId.value : conversations.value[0]?.id || ''
    if (activeConversationId.value) await loadMessages(activeConversationId.value, characterId)
    else messages.value = []
  }

  const loadMessages = async (conversationId: string, expectedCharacterId?: string) => {
    const conversation = await db.conversations.get(conversationId)
    if (!conversation || (expectedCharacterId && conversation.characterId !== expectedCharacterId)) {
      activeConversationId.value = ''
      messages.value = []
      return
    }
    activeConversationId.value = conversationId
    const loaded = await db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
    const normalizedWithEmpty = loaded.map((message) => normalizeMessage(message, conversation.characterId))
    const invalidIds = loaded
      .filter((message, index) => !normalizedWithEmpty[index] || (message.characterId && message.characterId !== conversation.characterId))
      .map((message) => message.id)
    const normalized = normalizedWithEmpty
      .filter((message): message is ChatMessage => Boolean(message))
      .filter((message) => message.characterId === conversation.characterId)

    if (invalidIds.length) await db.messages.bulkDelete(invalidIds)
    const changed = normalized.length !== loaded.length || normalized.some((message, index) => message.content !== loaded[index]?.content || message.characterId !== loaded[index]?.characterId)
    if (changed) await db.messages.bulkPut(normalized)
    messages.value = normalized
  }

  const newConversation = async (characterId: string) => {
    const conversation = await createConversationForCharacter(characterId)
    await loadForCharacter(characterId)
    activeConversationId.value = conversation.id
    messages.value = []
    return conversation
  }

  const renameConversation = async (id: string, title: string) => {
    const conv = await db.conversations.get(id)
    if (!conv) return
    await db.conversations.put({ ...conv, title: title.trim() || '未命名会话', updatedAt: nowIso() })
    await loadForCharacter(conv.characterId)
  }

  const deleteConversation = async (id: string) => {
    const conv = await db.conversations.get(id)
    if (!conv) return
    await db.transaction('rw', db.conversations, db.messages, db.memories, async () => {
      await db.messages.where('conversationId').equals(id).delete()
      await db.memories.where('conversationId').equals(id).delete()
      await db.conversations.delete(id)
    })
    activeConversationId.value = ''
    await loadForCharacter(conv.characterId)
  }

  const clearCurrent = async () => {
    if (!activeConversationId.value) return
    await db.messages.where('conversationId').equals(activeConversationId.value).delete()
    messages.value = []
  }

  const clearCharacterChat = async (characterId: string) => {
    await db.transaction('rw', db.conversations, db.messages, async () => {
      const characterConversations = await db.conversations.where('characterId').equals(characterId).toArray()
      await db.messages.where('characterId').equals(characterId).delete()
      if (characterConversations.length) await db.conversations.bulkDelete(characterConversations.map((conversation) => conversation.id))
    })
    activeConversationId.value = ''
    conversations.value = []
    messages.value = []
  }

  const removeMessage = async (id: string) => {
    await db.messages.delete(id)
    messages.value = messages.value.filter((item) => item.id !== id)
  }

  const editMessage = async (id: string, content: string) => {
    const msg = await db.messages.get(id)
    if (!msg) return
    const normalized = normalizeMessage({ ...msg, content: extractMessageText(content) || content, isEdited: true, updatedAt: nowIso() }, msg.characterId, msg.conversationId)
    if (normalized) await db.messages.put(normalized)
    await loadMessages(msg.conversationId)
  }

  const sendMessage = async (content: string) => {
    const app = useAppStore()
    const charStore = useCharacterStore()
    error.value = ''
    if (!app.canUseApi || !app.apiKey) throw new Error('请先输入全局 API Key 并通过连接测试。')
    const character = charStore.activeCharacter
    if (!character) throw new Error('请先选择角色。')
    let conversationId = activeConversationId.value
    const activeConversation = conversationId ? await db.conversations.get(conversationId) : undefined
    if (activeConversation && activeConversation.characterId !== character.id) conversationId = ''
    if (!conversationId) conversationId = (await newConversation(character.id)).id
    const now = nowIso()
    const userContent = extractMessageText(content) || content
    const userMsg = normalizeMessage({
      id: createId('msg'),
      characterId: character.id,
      conversationId,
      role: 'user',
      content: userContent,
      createdAt: now,
      updatedAt: now,
    }, character.id, conversationId)
    const assistantMsg = normalizeMessage({
      id: createId('msg'),
      characterId: character.id,
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isGenerating: true,
      model: '默认模型',
    }, character.id, conversationId)
    if (!userMsg || !assistantMsg) throw new Error('聊天消息格式异常，请重试。')
    await db.messages.bulkAdd([userMsg, assistantMsg])
    messages.value.push(userMsg, assistantMsg)
    generating.value = true
    controller = new AbortController()
    try {
      const recent = messages.value.filter((msg) => !msg.isGenerating).slice(-(app.preference?.recentContextCount ?? 16))
      const world = charStore.worldFor(character.id)
      const outfit = charStore.outfitsFor(character.id).find((item) => item.id === character.activeOutfitId || item.isActive)
      const pinned = await db.memories.where('characterId').equals(character.id).filter((m) => m.pinned && m.enabled && m.allowAIUse).toArray()
      const relevant = await findRelevantMemories(character.id, userContent, app.preference?.maxRelevantMemories ?? 8)
      const system = buildCharacterSystemPrompt({ character, world, outfit, pinnedMemories: pinned, relevantMemories: relevant })
      let final = ''
      for await (const chunk of openAICompatibleProvider.chat({
        apiKey: app.apiKey,
        providerId: app.detectedProviderId,
        messages: [{ role: 'system', content: system }, ...recent.map((m) => ({ role: m.role, content: extractMessageText(m.content) || m.content }))],
        signal: controller.signal,
      })) {
        if (chunk.done) break
        console.log('AI RAW RESPONSE:', chunk.content)
        const chunkContent = extractAIContent(chunk.content)
        console.log('FINAL CONTENT:', chunkContent)
        final += chunkContent
        assistantMsg.content = final
        assistantMsg.updatedAt = nowIso()
      }
      assistantMsg.isGenerating = false
      assistantMsg.content = extractAIContent(final) || '我暂时不知道该如何回答。'
      console.log('FINAL CONTENT:', assistantMsg.content)
      const savedAssistant = normalizeMessage({ ...assistantMsg, updatedAt: nowIso() }, character.id, conversationId)
      if (savedAssistant) await db.messages.put(savedAssistant)
      await db.conversations.update(conversationId, { updatedAt: nowIso(), lastMessageAt: nowIso(), title: conversations.value.find((c) => c.id === conversationId)?.title ?? content.slice(0, 18) })
      await maybeExtractMemory(character.id, conversationId, assistantMsg)
    } catch (err) {
      assistantMsg.isGenerating = false
      assistantMsg.isFailed = true
      assistantMsg.content = err instanceof DOMException && err.name === 'AbortError' ? '已停止生成。' : `生成失败：${err instanceof Error ? err.message : String(err)}`
      const savedError = normalizeMessage(assistantMsg, character.id, conversationId)
      if (savedError) await db.messages.put(savedError)
      error.value = assistantMsg.content
    } finally {
      generating.value = false
      controller = null
      await loadMessages(conversationId)
      await loadForCharacter(character.id)
    }
  }

  const maybeExtractMemory = async (characterId: string, conversationId: string, source: ChatMessage) => {
    const app = useAppStore()
    const charStore = useCharacterStore()
    if (!app.preference?.autoMemory || !app.apiKey || !charStore.activeCharacter) return
    const all = await db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
    if (all.length < app.preference.memoryInterval || all.length % app.preference.memoryInterval !== 0) return
    const candidates = await openAICompatibleProvider.extractMemories({
      apiKey: app.apiKey,
      providerId: app.detectedProviderId,
      messages: all.slice(-app.preference.memoryInterval),
      character: charStore.activeCharacter,
    })
    await saveMemoryCandidates(characterId, conversationId, candidates, source)
  }

  const stop = () => controller?.abort()

  return {
    conversations,
    messages,
    memories,
    activeConversationId,
    generating,
    error,
    loadForCharacter,
    loadMessages,
    newConversation,
    renameConversation,
    deleteConversation,
    clearCurrent,
    clearCharacterChat,
    removeMessage,
    editMessage,
    sendMessage,
    stop,
  }
})
