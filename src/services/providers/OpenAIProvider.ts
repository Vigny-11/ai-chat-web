import { CustomCompatibleProvider } from '@/services/providers/CustomCompatibleProvider'

export class OpenAIProvider extends CustomCompatibleProvider {
  id = 'openai'
  name = 'OpenAI'

  matches(apiKey: string) {
    return /^sk-[A-Za-z0-9_\-]{20,}/.test(apiKey) && !apiKey.startsWith('sk-ant-')
  }
}
