import { toChineseError } from '../utils/errors'

interface ProxyConfig {
  baseUrl: string
  apiPath: string
  model: string
  maxTokens: number
  temperature: number
  topP: number
  timeoutMs: number
  stream: boolean
}

const endpoint = (config: ProxyConfig) => {
  const base = config.baseUrl.replace(/\/$/, '')
  const path = config.apiPath.startsWith('/') ? config.apiPath : `/${config.apiPath}`
  return `${base}${path}`
}

export const requestOpenAI = async (config: ProxyConfig, apiKey: string, messages: unknown[], stream: boolean) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, config.timeoutMs || 30000))
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxTokens,
        stream,
      }),
      signal: controller.signal,
    }
    const res = await fetch(endpoint(config), init)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(toChineseError(`${res.status} ${text}`))
    }
    return res
  } catch (error) {
    throw new Error(toChineseError(error instanceof Error ? error.message : String(error)))
  } finally {
    clearTimeout(timeout)
  }
}
