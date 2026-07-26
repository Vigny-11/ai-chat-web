import type { ChatChunk, SenderRole, TestResult } from '@/types'
import { extractAIContent } from '@/utils/messageContent'

export interface ProviderTestResult extends TestResult {
  providerId?: string
  providerName?: string
}

export interface AIProvider {
  id: string
  name: string
  matches(apiKey: string): boolean
  testConnection(apiKey: string): Promise<ProviderTestResult>
  chat(apiKey: string, messages: Array<{ role: SenderRole; content: string }>): Promise<Response>
  streamChat(apiKey: string, messages: Array<{ role: SenderRole; content: string }>, signal?: AbortSignal): AsyncGenerator<ChatChunk>
}

export const parseUserFriendlyError = (message: string) => {
  if (/401|403|unauthorized|forbidden|invalid api key|API Key 无效/i.test(message)) return 'API Key 无效，请重新输入'
  if (/quota|balance|insufficient|余额|额度/i.test(message)) return 'API 余额不足，请检查账户额度'
  if (/timeout|aborted|超时/i.test(message)) return 'AI 服务暂时不可用，请稍后重试'
  if (/fetch|network|ENOTFOUND|ECONNREFUSED|无法访问|连接失败/i.test(message)) return '网络连接失败，请检查网络'
  return 'AI 服务暂时不可用，请稍后重试'
}

export const proxyPost = async (path: string, body: unknown, signal?: AbortSignal) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(await response.text())
  return response
}

export async function* readProxyStream(response: Response): AsyncGenerator<ChatChunk> {
  if (!response.body) throw new Error('当前浏览器不支持流式读取。')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        const payload = buffer.startsWith('data:') ? buffer.slice(5).trim() : buffer.trim()
        if (payload === '[DONE]') {
          yield { content: '', done: true }
        } else {
          const content = extractAIContent(payload)
          if (content) yield { content }
        }
      }
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') {
        yield { content: '', done: true }
        continue
      }
      try {
        const parsed = JSON.parse(payload) as ChatChunk | Record<string, unknown>
        yield { content: extractAIContent(parsed), done: Boolean((parsed as ChatChunk).done) }
      } catch {
        yield { content: extractAIContent(payload) }
      }
    }
  }
}
