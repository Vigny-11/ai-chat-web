import JSZip from 'jszip'
import type { BackupData, ImportPreview } from '@/types'

export const backupFilename = () => {
  const stamp = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\//g, '-')
  return `角色世界AI备份_${stamp}.zip`
}

export const parseBackupZip = async (file: File | Blob): Promise<BackupData> => {
  const zip = await JSZip.loadAsync(file)
  const entry = zip.file('data.json') ?? zip.file('backup.json')
  if (!entry) throw new Error('备份文件缺少 data.json。')
  const parsed = JSON.parse(await entry.async('string')) as Partial<BackupData>
  if (!parsed.version || !Array.isArray(parsed.characters) || !Array.isArray(parsed.messages) || !Array.isArray(parsed.memories)) {
    throw new Error('备份格式不完整，无法导入。')
  }
  return parsed as BackupData
}

export const createImportPreview = (backup: BackupData): ImportPreview => ({
  version: backup.version,
  characters: backup.characters.length,
  conversations: backup.conversations.length,
  messages: backup.messages.length,
  memories: backup.memories.length,
  images: backup.images.length + backup.outfits.filter((item) => item.imageDataUrl).length,
})
