import { parseUserFriendlyError, proxyPost, readProxyStream, type AIProvider, type ProviderTestResult } from '@/services/providers/AIProvider'
import type { SenderRole } from '@/types'

export class CustomCompatibleProvider implements AIProvider {
  id = 'custom-compatible'
  name = 'OpenAI 兼容服务'

  matches(_apiKey: string) {
    return true
  }

  async testConnection(apiKey: string): Promise<ProviderTestResult> {
    try {
      const response = await proxyPost('/api/test', { apiKey })
      return (await response.json()) as ProviderTestResult
    } catch (error) {
      return { ok: false, message: parseUserFriendlyError(error instanceof Error ? error.message : String(error)) }
    }
  }

  async chat(apiKey: string, messages: Array<{ role: SenderRole; content: string }>) {
    return proxyPost('/api/chat', { apiKey, messages, stream: false })
  }

  async *streamChat(apiKey: string, messages: Array<{ role: SenderRole; content: string }>, signal?: AbortSignal) {
    yield* readProxyStream(await proxyPost('/api/chat', { apiKey, messages }, signal))
  }
}
