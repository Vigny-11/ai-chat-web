import { defaultOptions, withTimeout, type ProviderResult, type ServerAIProvider } from './AIProvider'

export class GeminiProvider implements ServerAIProvider {
  id = 'gemini' as const
  name = 'Google Gemini'
  private model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

  matches(apiKey: string) {
    return apiKey.startsWith('AIza')
  }

  async testConnection(apiKey: string): Promise<ProviderResult> {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 16)
    return { ok: true, message: '连接成功，可以开始创建角色', providerId: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: any[], stream: boolean, maxTokens = defaultOptions.maxTokens) {
    const path = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
    const separator = path.includes('?') ? '&' : '?'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:${path}${separator}key=${apiKey}`
    const text = messages.map((item) => `${item.role}：${item.content}`).join('\n')
    return withTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: defaultOptions.temperature, topP: defaultOptions.topP, maxOutputTokens: maxTokens },
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? ''
  }
}
