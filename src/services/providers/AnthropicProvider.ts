import { CustomCompatibleProvider } from '@/services/providers/CustomCompatibleProvider'

export class AnthropicProvider extends CustomCompatibleProvider {
  id = 'anthropic'
  name = 'Anthropic'

  matches(apiKey: string) {
    return apiKey.startsWith('sk-ant-')
  }
}
