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
      const data = (await response.json()) as { success?: boolean; provider?: string; message?: string }
      return {
        ok: Boolean(data.success),
        message: data.success ? '连接成功，可以开始创建角色' : data.message ?? 'AI 服务暂时不可用，请稍后重试',
        providerId: data.provider,
        providerName: data.provider,
      }
    } catch (error) {
      return { ok: false, message: parseUserFriendlyError(error instanceof Error ? error.message : String(error)) }
    }
  }
}

export const providerDetector = new ProviderDetector()
