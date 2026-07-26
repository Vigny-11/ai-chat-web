export type ProviderId = 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'custom-compatible'

export interface ProviderResult {
  ok: boolean
  message: string
  providerId?: ProviderId
  providerName?: string
}

export interface ServerAIProvider {
  id: ProviderId
  name: string
  matches(apiKey: string): boolean
  testConnection(apiKey: string): Promise<ProviderResult>
  chat(apiKey: string, messages: unknown[], stream: boolean, maxTokens?: number): Promise<Response>
  extractContent(payload: unknown): string
}

export const defaultOptions = {
  temperature: 0.8,
  topP: 0.9,
  timeoutMs: 30000,
  maxTokens: 1200,
}

export const toChineseError = (message: string) => {
  if (/401|403|unauthorized|forbidden|invalid[_\s-]?api[_\s-]?key/i.test(message)) return 'API Key 无效，请重新输入'
  if (/quota|balance|insufficient|billing/i.test(message)) return 'API 余额不足，请检查账户额度'
  if (/timeout|aborted/i.test(message)) return 'AI 服务暂时不可用，请稍后重试'
  if (/fetch failed|network|getaddrinfo|ECONNREFUSED|ENOTFOUND/i.test(message)) return '网络连接失败，请检查网络'
  if (/model|404/i.test(message)) return 'AI 服务暂时不可用，请稍后重试'
  return 'AI 服务暂时不可用，请稍后重试'
}

export const withTimeout = async (url: string, init: RequestInit, timeoutMs = defaultOptions.timeoutMs) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    return response
  } catch (error) {
    throw new Error(toChineseError(error instanceof Error ? error.message : String(error)))
  } finally {
    clearTimeout(timeout)
  }
}
