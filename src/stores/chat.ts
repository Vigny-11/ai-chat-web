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
import { extractMessageText } from '@/utils/messageContent'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const memories = ref<Memory[]>([])
  const activeConversationId = ref('')
  const generating = ref(false)
  const error = ref('')
  let controller: AbortController | null = null

  const normalizeMessage = (message: ChatMessage): ChatMessage => {
    const content = extractMessageText(message.content)
    return {
      ...message,
      content: content || (typeof message.content === 'string' ? message.content : ''),
    }
  }

  const loadForCharacter = async (characterId: string) => {
    conversations.value = await db.conversations.where('characterId').equals(characterId).reverse().sortBy('updatedAt')
    memories.value = await db.memories.where('characterId').equals(characterId).toArray()
    if (!activeConversationId.value && conversations.value[0]) activeConversationId.value = conversations.value[0].id
    if (activeConversationId.value) await loadMessages(activeConversationId.value)
  }

  const loadMessages = async (conversationId: string) => {
    activeConversationId.value = conversationId
    messages.value = (await db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')).map(normalizeMessage)
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

  const removeMessage = async (id: string) => {
    await db.messages.delete(id)
    messages.value = messages.value.filter((item) => item.id !== id)
  }

  const editMessage = async (id: string, content: string) => {
    const msg = await db.messages.get(id)
    if (!msg) return
    await db.messages.put({ ...msg, content: extractMessageText(content) || content, isEdited: true, updatedAt: nowIso() })
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
    if (!conversationId) conversationId = (await newConversation(character.id)).id
    const now = nowIso()
    const userContent = extractMessageText(content) || content
    const userMsg: ChatMessage = {
      id: createId('msg'),
      conversationId,
      role: 'user',
      content: userContent,
      createdAt: now,
      updatedAt: now,
    }
    const assistantMsg: ChatMessage = {
      id: createId('msg'),
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isGenerating: true,
      model: '默认模型',
    }
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
        final += extractMessageText(chunk.content)
        assistantMsg.content = final
        assistantMsg.updatedAt = nowIso()
      }
      assistantMsg.isGenerating = false
      assistantMsg.content = extractMessageText(final) || '我暂时不知道该如何回答。'
      await db.messages.put({ ...assistantMsg, updatedAt: nowIso() })
      await db.conversations.update(conversationId, { updatedAt: nowIso(), lastMessageAt: nowIso(), title: conversations.value.find((c) => c.id === conversationId)?.title ?? content.slice(0, 18) })
      await maybeExtractMemory(character.id, conversationId, assistantMsg)
    } catch (err) {
      assistantMsg.isGenerating = false
      assistantMsg.isFailed = true
      assistantMsg.content = err instanceof DOMException && err.name === 'AbortError' ? '已停止生成。' : `生成失败：${err instanceof Error ? err.message : String(err)}`
      await db.messages.put(assistantMsg)
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
    removeMessage,
    editMessage,
    sendMessage,
    stop,
  }
})
