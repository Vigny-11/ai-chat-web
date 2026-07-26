export type RuntimeProviderId = 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'custom-compatible'

export interface RuntimeProviderResult {
  success: boolean
  provider?: RuntimeProviderId
  providerName?: string
  message?: string
}

export interface RuntimeAIProvider {
  id: RuntimeProviderId
  name: string
  matches(apiKey: string): boolean
  testConnection(apiKey: string): Promise<RuntimeProviderResult>
  chat(apiKey: string, messages: unknown[], stream: boolean, maxTokens?: number): Promise<Response>
  extractContent(payload: unknown): string
}

const options = {
  temperature: 0.8,
  topP: 0.9,
  timeoutMs: 30000,
  maxTokens: 1200,
}

export const toSimpleChineseError = (message: string) => {
  if (/401|403|unauthorized|forbidden|invalid[_\s-]?api[_\s-]?key/i.test(message)) return 'API Key 无效，请重新输入'
  if (/quota|balance|insufficient|billing/i.test(message)) return 'API 余额不足，请检查账户额度'
  if (/timeout|aborted/i.test(message)) return 'AI 服务暂时不可用，请稍后重试'
  if (/fetch failed|network|getaddrinfo|ECONNREFUSED|ENOTFOUND/i.test(message)) return '网络连接失败，请检查网络'
  return 'AI 服务暂时不可用，请稍后重试'
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = options.timeoutMs) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    return response
  } catch (error) {
    throw new Error(toSimpleChineseError(error instanceof Error ? error.message : String(error)))
  } finally {
    clearTimeout(timeout)
  }
}

class OpenAIProvider implements RuntimeAIProvider {
  id: RuntimeProviderId = 'openai'
  name = 'OpenAI'
  protected url = 'https://api.openai.com/v1/chat/completions'
  protected model = 'gpt-4o-mini'

  matches(apiKey: string) {
    return /^sk-[A-Za-z0-9_\-]{20,}/.test(apiKey) && !apiKey.startsWith('sk-ant-')
  }

  async testConnection(apiKey: string) {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 8)
    return { success: true, provider: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: unknown[], stream: boolean, maxTokens = options.maxTokens) {
    return fetchWithTimeout(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature,
        top_p: options.topP,
        max_tokens: maxTokens,
        stream,
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.message?.content ?? ''
  }
}

class DeepSeekProvider extends OpenAIProvider {
  id: RuntimeProviderId = 'deepseek'
  name = 'DeepSeek'
  protected url = 'https://api.deepseek.com/chat/completions'
  protected model = 'deepseek-chat'
}

class CustomCompatibleProvider extends OpenAIProvider {
  id: RuntimeProviderId = 'custom-compatible'
  name = 'OpenAI Compatible'

  matches() {
    return true
  }
}

class AnthropicProvider implements RuntimeAIProvider {
  id: RuntimeProviderId = 'anthropic'
  name = 'Anthropic'
  private url = 'https://api.anthropic.com/v1/messages'
  private model = 'claude-3-5-haiku-latest'

  matches(apiKey: string) {
    return apiKey.startsWith('sk-ant-')
  }

  async testConnection(apiKey: string) {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 16)
    return { success: true, provider: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: any[], stream: boolean, maxTokens = options.maxTokens) {
    const system = messages.find((item) => item.role === 'system')?.content
    const cleanMessages = messages
      .filter((item) => item.role !== 'system')
      .map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content }))
    return fetchWithTimeout(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: this.model,
        system,
        messages: cleanMessages.length ? cleanMessages : [{ role: 'user', content: '你好' }],
        max_tokens: maxTokens,
        temperature: options.temperature,
        stream,
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.delta?.text ?? payload?.content?.[0]?.text ?? ''
  }
}

class GeminiProvider implements RuntimeAIProvider {
  id: RuntimeProviderId = 'gemini'
  name = 'Google Gemini'
  private model = 'gemini-1.5-flash'

  matches(apiKey: string) {
    return apiKey.startsWith('AIza')
  }

  async testConnection(apiKey: string) {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 16)
    return { success: true, provider: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: any[], stream: boolean, maxTokens = options.maxTokens) {
    const path = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
    const separator = path.includes('?') ? '&' : '?'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:${path}${separator}key=${apiKey}`
    const text = messages.map((item) => `${item.role}：${item.content}`).join('\n')
    return fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: options.temperature, topP: options.topP, maxOutputTokens: maxTokens },
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? ''
  }
}

export const runtimeProviders: RuntimeAIProvider[] = [
  new AnthropicProvider(),
  new GeminiProvider(),
  new DeepSeekProvider(),
  new OpenAIProvider(),
  new CustomCompatibleProvider(),
]

export const detectRuntimeProvider = async (apiKey: string): Promise<RuntimeProviderResult> => {
  if (!apiKey?.trim()) return { success: false, message: 'API Key 无效，请重新输入' }
  const candidates = runtimeProviders.filter((provider) => provider.matches(apiKey))
  const queue = candidates.length ? candidates : runtimeProviders
  let lastError = ''
  for (const provider of queue) {
    try {
      return await provider.testConnection(apiKey)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  return { success: false, message: toSimpleChineseError(lastError) }
}

export const resolveRuntimeProvider = async (apiKey: string, providerId?: string) => {
  const selected = runtimeProviders.find((provider) => provider.id === providerId)
  if (selected) return selected
  const detected = await detectRuntimeProvider(apiKey)
  const provider = runtimeProviders.find((item) => item.id === detected.provider)
  if (!provider) throw new Error(detected.message || 'AI 服务暂时不可用，请稍后重试')
  return provider
}

export const streamToClient = (upstream: Response, provider: RuntimeAIProvider) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader()
      if (!reader) {
        controller.enqueue(encoder.encode('data: {"content":"AI 服务暂时不可用，请稍后重试"}\n\n'))
        controller.close()
        return
      }
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            continue
          }
          try {
            const content = provider.extractContent(JSON.parse(payload))
            if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
          } catch {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: payload })}\n\n`))
          }
        }
      }
      controller.close()
    },
  })
}
