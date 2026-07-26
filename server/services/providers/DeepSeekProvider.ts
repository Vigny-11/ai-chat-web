import { defaultOptions, withTimeout, type ProviderResult, type ServerAIProvider } from './AIProvider'

export class DeepSeekProvider implements ServerAIProvider {
  id = 'deepseek' as const
  name = 'DeepSeek'
  private url = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions'
  private model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  matches(apiKey: string) {
    return /^sk-[A-Za-z0-9_\-]{20,}/.test(apiKey) && !apiKey.startsWith('sk-ant-')
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
