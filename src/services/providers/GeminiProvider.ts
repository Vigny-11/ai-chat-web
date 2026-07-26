import { CustomCompatibleProvider } from '@/services/providers/CustomCompatibleProvider'

export class GeminiProvider extends CustomCompatibleProvider {
  id = 'gemini'
  name = 'Google Gemini'

  matches(apiKey: string) {
    return apiKey.startsWith('AIza')
  }
}
