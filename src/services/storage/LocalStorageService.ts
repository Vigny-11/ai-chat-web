import JSZip from 'jszip'
import { db, ensureDefaults } from '@/database/db'
import type { BackupData, Character, ChatMessage, Conversation, DataStorage, LocalDataStats, Memory, ServerSyncConfig } from '@/types'

const BACKUP_VERSION = '1.1.0'

const stripApiKey = (value: BackupData): BackupData => JSON.parse(JSON.stringify(value, (key, item) => (key.toLowerCase().includes('apikey') ? undefined : item))) as BackupData

export class LocalStorageService implements DataStorage {
  async saveCharacter(character: Character) {
    await db.characters.put(character)
  }

  async getCharacters() {
    return db.characters.orderBy('updatedAt').reverse().toArray()
  }

  async deleteCharacter(id: string) {
    await db.characters.delete(id)
  }

  async saveConversation(conversation: Conversation) {
    await db.conversations.put(conversation)
  }

  async getMessages(conversationId: string) {
    return db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
  }

  async saveMemory(memory: Memory) {
    await db.memories.put(memory)
  }

  async getMemories(characterId: string) {
    return db.memories.where('characterId').equals(characterId).toArray()
  }

  async collectBackupData(): Promise<BackupData> {
    return stripApiKey({
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      characters: await db.characters.toArray(),
      images: await db.images.toArray(),
      outfits: await db.outfits.toArray(),
      worlds: await db.worlds.toArray(),
      conversations: await db.conversations.toArray(),
      messages: await db.messages.toArray(),
      memories: await db.memories.toArray(),
      preferences: await db.preferences.toArray(),
    })
  }

  async exportData() {
    const backup = await this.collectBackupData()
    const zip = new JSZip()
    const data = JSON.stringify(backup, null, 2)
    zip.file('data.json', data)
    zip.file('characters/characters.json', JSON.stringify(backup.characters, null, 2))
    zip.file('outfits/outfits.json', JSON.stringify(backup.outfits, null, 2))
    zip.file('images/images.json', JSON.stringify(backup.images, null, 2))
    zip.file('conversations/conversations.json', JSON.stringify(backup.conversations, null, 2))
    zip.file('memories/memories.json', JSON.stringify(backup.memories, null, 2))
    return zip.generateAsync({ type: 'blob' })
  }

  async importData(backup: BackupData, mode: 'merge' | 'overwrite') {
    const safe = stripApiKey(backup)
    await db.transaction('rw', [db.characters, db.images, db.outfits, db.worlds, db.conversations, db.messages, db.memories, db.preferences], async () => {
      if (mode === 'overwrite') {
        await Promise.all([db.characters.clear(), db.images.clear(), db.outfits.clear(), db.worlds.clear(), db.conversations.clear(), db.messages.clear(), db.memories.clear(), db.preferences.clear()])
      }
      await db.characters.bulkPut(safe.characters ?? [])
      await db.images.bulkPut(safe.images ?? [])
      await db.outfits.bulkPut(safe.outfits ?? [])
      await db.worlds.bulkPut(safe.worlds ?? [])
      await db.conversations.bulkPut(safe.conversations ?? [])
      await db.messages.bulkPut(safe.messages ?? [])
      await db.memories.bulkPut(safe.memories ?? [])
      await db.preferences.bulkPut(safe.preferences ?? [])
    })
    await ensureDefaults()
  }

  async syncUpload(config: ServerSyncConfig) {
    const { cloudSyncService } = await import('@/services/storage/CloudSyncService')
    await cloudSyncService.upload(config, await this.exportData())
  }

  async syncDownload(config: ServerSyncConfig) {
    const { cloudSyncService } = await import('@/services/storage/CloudSyncService')
    return cloudSyncService.download(config)
  }

  async getStats(): Promise<LocalDataStats> {
    const backup = await this.collectBackupData()
    const bytes = new Blob([JSON.stringify(backup)]).size
    return {
      characters: backup.characters.length,
      conversations: backup.conversations.length,
      messages: backup.messages.length,
      memories: backup.memories.length,
      images: backup.images.length + backup.outfits.filter((item) => item.imageDataUrl).length,
      bytes,
    }
  }
}

export const localStorageService = new LocalStorageService()
