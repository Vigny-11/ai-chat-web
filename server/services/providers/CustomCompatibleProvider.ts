import { defaultOptions, withTimeout, type ProviderResult, type ServerAIProvider } from './AIProvider'

export class CustomCompatibleProvider implements ServerAIProvider {
  id = 'custom-compatible' as const
  name = 'OpenAI 兼容服务'
  private url = process.env.CUSTOM_COMPATIBLE_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions'
  private model = process.env.CUSTOM_COMPATIBLE_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

  matches(_apiKey: string) {
    return true
  }

  async testConnection(apiKey: string): Promise<ProviderResult> {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 8)
    return { ok: true, message: '连接成功，可以开始创建角色', providerId: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: unknown[], stream: boolean, maxTokens = defaultOptions.maxTokens) {
    return withTimeout(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: defaultOptions.temperature,
        top_p: defaultOptions.topP,
        max_tokens: maxTokens,
        stream,
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.message?.content ?? ''
  }
}
