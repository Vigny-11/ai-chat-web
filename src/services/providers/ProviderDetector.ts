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
      const response = await proxyPost('/api/provider/detect', { apiKey })
      return (await response.json()) as ProviderTestResult
    } catch (error) {
      return { ok: false, message: parseUserFriendlyError(error instanceof Error ? error.message : String(error)) }
    }
  }
}

export const providerDetector = new ProviderDetector()
