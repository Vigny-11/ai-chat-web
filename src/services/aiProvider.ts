import type { AIProvider, ChatChunk, ChatRequest, MemoryCandidate, MemoryExtractRequest, TestResult } from '@/types'

const parseProxyError = (message: string) => {
  if (/401|unauthorized|invalid api key|API Key 无效/i.test(message)) return 'API Key 无效，请重新输入'
  if (/timeout|aborted|超时/i.test(message)) return 'AI 服务暂时不可用，请稍后重试'
  if (/insufficient|balance|quota|余额|额度/i.test(message)) return 'API 余额不足，请检查账户额度'
  if (/failed to fetch|network|无法访问|连接失败|ECONNREFUSED|ENOTFOUND/i.test(message)) return '网络连接失败，请检查网络'
  return 'AI 服务暂时不可用，请稍后重试'
}

const proxyFetch = async (path: string, body: unknown, signal?: AbortSignal) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseProxyError(text))
  }
  return res
}

export const openAICompatibleProvider: AIProvider = {
  async testConnection(apiKey): Promise<TestResult> {
    try {
      const res = await proxyFetch('/api/test', { apiKey })
      const data = (await res.json()) as TestResult
      return data
    } catch (error) {
      return { ok: false, message: parseProxyError(error instanceof Error ? error.message : String(error)) }
    }
  },

  async *chat(request: ChatRequest): AsyncGenerator<ChatChunk> {
      const res = await proxyFetch('/api/chat', request, request.signal)
    if (!res.body) throw new Error('当前浏览器不支持流式读取。')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          yield { content: '', done: true }
          continue
        }
        try {
          const parsed = JSON.parse(payload) as ChatChunk
          yield parsed
        } catch {
          yield { content: payload }
        }
      }
    }
  },

  async extractMemories(request: MemoryExtractRequest): Promise<MemoryCandidate[]> {
    try {
      const res = await proxyFetch('/api/memory/extract', request)
      const data = (await res.json()) as { memories?: MemoryCandidate[] }
      return Array.isArray(data.memories) ? data.memories : []
    } catch {
      return []
    }
  },
}
