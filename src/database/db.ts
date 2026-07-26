import Dexie, { type Table } from 'dexie'
import type {
  Character,
  CharacterImage,
  ChatMessage,
  Conversation,
  GlobalAIConfig,
  Memory,
  Outfit,
  ServerSyncConfig,
  UserPreference,
  WorldSetting,
} from '@/types'
import { createId, nowIso } from '@/utils/id'
import { extractMessageText } from '@/utils/messageContent'

export class RoleWorldDatabase extends Dexie {
  globalAIConfigs!: Table<GlobalAIConfig, string>
  characters!: Table<Character, string>
  worlds!: Table<WorldSetting, string>
  images!: Table<CharacterImage, string>
  outfits!: Table<Outfit, string>
  conversations!: Table<Conversation, string>
  messages!: Table<ChatMessage, string>
  memories!: Table<Memory, string>
  preferences!: Table<UserPreference, string>
  syncConfigs!: Table<ServerSyncConfig, string>

  constructor() {
    super('ai_role_chat_system')
    this.version(1).stores({
      apiConfigs: 'id, provider, connectionTested',
      characters: 'id, name, updatedAt',
      worlds: 'id, characterId',
      images: 'id, characterId, kind',
      outfits: 'id, characterId, isActive',
      conversations: 'id, characterId, updatedAt',
      messages: 'id, conversationId, role, createdAt',
      memories: 'id, characterId, conversationId, type, pinned, enabled, allowAIUse, updatedAt',
      preferences: 'id',
      syncConfigs: 'id',
    })
    this.version(2).stores({
      apiConfigs: null,
      globalAIConfigs: 'id',
      characters: 'id, name, updatedAt',
      worlds: 'id, characterId',
      images: 'id, characterId, kind',
      outfits: 'id, characterId, isActive',
      conversations: 'id, characterId, updatedAt',
      messages: 'id, conversationId, role, createdAt',
      memories: 'id, characterId, conversationId, type, pinned, enabled, allowAIUse, updatedAt',
      preferences: 'id',
      syncConfigs: 'id',
    })
    this.version(3)
      .stores({
        apiConfigs: null,
        globalAIConfigs: 'id',
        characters: 'id, name, updatedAt',
        worlds: 'id, characterId',
        images: 'id, characterId, kind',
        outfits: 'id, characterId, isActive',
        conversations: 'id, characterId, updatedAt',
        messages: 'id, characterId, conversationId, role, createdAt',
        memories: 'id, characterId, conversationId, type, pinned, enabled, allowAIUse, updatedAt',
        preferences: 'id',
        syncConfigs: 'id',
      })
      .upgrade(async (transaction) => {
        const conversations = await transaction.table('conversations').toArray()
        const characterByConversation = new Map<string, string>(conversations.map((item) => [item.id, item.characterId]))
        const messageTable = transaction.table('messages')
        const messages = await messageTable.toArray()

        await Promise.all(
          messages.map(async (raw) => {
            const message = raw as ChatMessage & { text?: unknown; message?: unknown }
            const characterId = message.characterId || characterByConversation.get(message.conversationId)
            const content = extractMessageText(message.content ?? message.text ?? message.message ?? message)

            if (!characterId || (!content && !message.isGenerating)) {
              await messageTable.delete(message.id)
              return
            }

            await messageTable.put({
              ...message,
              characterId,
              content,
              updatedAt: message.updatedAt || nowIso(),
            })
          }),
        )
      })
  }
}

export const db = new RoleWorldDatabase()

export const defaultPreference = (): UserPreference => {
  const time = nowIso()
  return {
    id: 'default',
    createdAt: time,
    updatedAt: time,
    theme: 'system',
    fontSize: 'medium',
    bubbleSize: 'comfortable',
    compactMobile: false,
    recentContextCount: 16,
    autoMemory: true,
    memoryInterval: 10,
    maxRelevantMemories: 8,
    showMessageTime: true,
    typingAnimation: true,
  }
}

export const ensureDefaults = async () => {
  const pref = await db.preferences.get('default')
  if (!pref) await db.preferences.put(defaultPreference())
  const sync = await db.syncConfigs.get('default')
  if (!sync) {
    const time = nowIso()
    await db.syncConfigs.put({ id: 'default', createdAt: time, updatedAt: time, enabled: false })
  }
}

export const createConversationForCharacter = async (characterId: string, title = '新的会话') => {
  const time = nowIso()
  const conversation: Conversation = { id: createId('conv'), characterId, title, createdAt: time, updatedAt: time }
  await db.conversations.add(conversation)
  return conversation
}
