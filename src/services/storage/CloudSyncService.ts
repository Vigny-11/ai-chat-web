import JSZip from 'jszip'
import type { BackupData, ServerSyncConfig } from '@/types'

const joinUrl = (base?: string, path?: string) => {
  if (!base?.trim()) throw new Error('请填写服务器地址')
  if (!path?.trim()) throw new Error('请填写同步路径')
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

const headers = (config: ServerSyncConfig, contentType?: string) => {
  const result: Record<string, string> = {}
  if (contentType) result['Content-Type'] = contentType
  if (config.accessToken?.trim()) result.Authorization = `Bearer ${config.accessToken.trim()}`
  return result
}

const toChineseError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  if (/Failed to fetch|NetworkError|ENOTFOUND|ECONNREFUSED|无法访问/i.test(message)) return '网络连接失败，请检查服务器地址'
  if (/401|403|unauthorized|forbidden/i.test(message)) return '访问密钥无效，请重新填写'
  if (/404/i.test(message)) return '同步路径不存在，请检查同步路径'
  return message || '云端同步失败，请稍后重试'
}

export class CloudSyncService {
  async testConnection(config: ServerSyncConfig) {
    try {
      const response = await fetch(joinUrl(config.serverUrl, config.syncPath), {
        method: 'HEAD',
        headers: headers(config),
      })
      if (!response.ok && response.status !== 404) throw new Error(String(response.status))
      return { ok: true, message: '服务器连接成功' }
    } catch (error) {
      return { ok: false, message: toChineseError(error) }
    }
  }

  async upload(config: ServerSyncConfig, blob: Blob) {
    try {
      const response = await fetch(joinUrl(config.serverUrl, config.syncPath), {
        method: 'PUT',
        headers: headers(config, 'application/zip'),
        body: blob,
      })
      if (!response.ok) throw new Error(String(response.status))
    } catch (error) {
      throw new Error(toChineseError(error))
    }
  }

  async download(config: ServerSyncConfig): Promise<BackupData> {
    try {
      const response = await fetch(joinUrl(config.serverUrl, config.syncPath), {
        method: 'GET',
        headers: headers(config),
      })
      if (!response.ok) throw new Error(String(response.status))
      const zip = await JSZip.loadAsync(await response.blob())
      const entry = zip.file('data.json') ?? zip.file('backup.json')
      if (!entry) throw new Error('云端备份缺少 data.json')
      const parsed = JSON.parse(await entry.async('string')) as BackupData
      if (!parsed.version || !Array.isArray(parsed.characters) || !Array.isArray(parsed.messages)) {
        throw new Error('云端备份格式不完整')
      }
      return parsed
    } catch (error) {
      throw new Error(toChineseError(error))
    }
  }
}

export const cloudSyncService = new CloudSyncService()
