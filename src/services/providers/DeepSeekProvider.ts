import { CustomCompatibleProvider } from '@/services/providers/CustomCompatibleProvider'

export class DeepSeekProvider extends CustomCompatibleProvider {
  id = 'deepseek'
  name = 'DeepSeek'

  matches(apiKey: string) {
    return /^sk-[A-Za-z0-9_\-]{20,}/.test(apiKey) && !apiKey.startsWith('sk-ant-')
  }
}
