import { AnthropicProvider } from './AnthropicProvider'
import { CustomCompatibleProvider } from './CustomCompatibleProvider'
import { DeepSeekProvider } from './DeepSeekProvider'
import { GeminiProvider } from './GeminiProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { toChineseError, type ProviderId, type ProviderResult, type ServerAIProvider } from './AIProvider'

export const providers: ServerAIProvider[] = [
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

  getProvider(id?: ProviderId) {
    return providers.find((provider) => provider.id === id)
  }

  async detect(apiKey: string): Promise<ProviderResult> {
    let lastError = ''
    for (const provider of this.getCandidates(apiKey)) {
      try {
        return await provider.testConnection(apiKey)
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }
    return { ok: false, message: toChineseError(lastError) }
  }

  async resolve(apiKey: string, providerId?: ProviderId) {
    const selected = this.getProvider(providerId)
    if (selected) return selected
    const detected = await this.detect(apiKey)
    const provider = this.getProvider(detected.providerId)
    if (!provider) throw new Error(detected.message)
    return provider
  }
}

export const providerDetector = new ProviderDetector()
