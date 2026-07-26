import type { InternalAIConfig } from '@/types'

export const defaultAIConfig: InternalAIConfig = {
  baseUrl: 'https://api.openai.com',
  apiPath: '/v1/chat/completions',
  model: 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.8,
  topP: 0.9,
  timeoutMs: 30000,
  stream: true,
}
