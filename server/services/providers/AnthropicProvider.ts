import { defaultOptions, withTimeout, type ProviderResult, type ServerAIProvider } from './AIProvider'

export class AnthropicProvider implements ServerAIProvider {
  id = 'anthropic' as const
  name = 'Anthropic'
  private url = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages'
  private model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest'

  matches(apiKey: string) {
    return apiKey.startsWith('sk-ant-')
  }

  async testConnection(apiKey: string): Promise<ProviderResult> {
    await this.chat(apiKey, [{ role: 'user', content: '请只回复“连接成功”。' }], false, 16)
    return { ok: true, message: '连接成功，可以开始创建角色', providerId: this.id, providerName: this.name }
  }

  chat(apiKey: string, messages: any[], stream: boolean, maxTokens = defaultOptions.maxTokens) {
    const system = messages.find((item) => item.role === 'system')?.content
    const cleanMessages = messages.filter((item) => item.role !== 'system').map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content }))
    return withTimeout(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: this.model,
        system,
        messages: cleanMessages.length ? cleanMessages : [{ role: 'user', content: '你好' }],
        max_tokens: maxTokens,
        temperature: defaultOptions.temperature,
        stream,
      }),
    })
  }

  extractContent(payload: any) {
    return payload?.delta?.text ?? payload?.content?.[0]?.text ?? ''
  }
}
