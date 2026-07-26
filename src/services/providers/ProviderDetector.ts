import { AnthropicProvider } from '@/services/providers/AnthropicProvider'
import { CustomCompatibleProvider } from '@/services/providers/CustomCompatibleProvider'
import { DeepSeekProvider } from '@/services/providers/DeepSeekProvider'
import { GeminiProvider } from '@/services/providers/GeminiProvider'
import { OpenAIProvider } from '@/services/providers/OpenAIProvider'
import { parseUserFriendlyError, proxyPost, type ProviderTestResult } from '@/services/providers/AIProvider'

export const providers = [
  new AnthropicProvider(),
  new GeminiProvider(),
  new DeepSeekProvider(),
  new OpenAIProvider(),
  new CustomCompatibleProvider(),
]

export class ProviderDetector {
  getCandidates(apiKey: string) {
    const matched = providers.filter((provider) => provider.matches(apiKey))
    return matched.length ? matched : providers
  }

  async detect(apiKey: string): Promise<ProviderTestResult> {
    try {
      const response = await proxyPost('/api/test', { apiKey })
      const data = (await response.json()) as {
        ok?: boolean
        success?: boolean
        provider?: string
        providerId?: string
        providerName?: string
        message?: string
      }
      const connected = Boolean(data.success ?? data.ok)
      return {
        ok: connected,
        message: connected ? '连接成功，可以开始创建角色' : data.message ?? 'AI 服务暂时不可用，请稍后重试',
        providerId: data.provider ?? data.providerId,
        providerName: data.providerName ?? data.provider ?? data.providerId,
      }
    } catch (error) {
      return { ok: false, message: parseUserFriendlyError(error instanceof Error ? error.message : String(error)) }
    }
  }
}

export const providerDetector = new ProviderDetector()
