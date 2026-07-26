import type { AIProvider as LegacyAIProvider, ChatChunk, MemoryCandidate, MemoryExtractRequest } from '@/types'
import { providerDetector } from '@/services/providers/ProviderDetector'
import { parseUserFriendlyError, proxyPost, readProxyStream } from '@/services/providers/AIProvider'

export const detectedAIProvider: LegacyAIProvider = {
  async testConnection(apiKey) {
    return providerDetector.detect(apiKey)
  },

  async *chat(request): AsyncGenerator<ChatChunk> {
    try {
      yield* readProxyStream(await proxyPost('/api/chat', { apiKey: request.apiKey, providerId: request.providerId, messages: request.messages }, request.signal))
    } catch (error) {
      throw new Error(parseUserFriendlyError(error instanceof Error ? error.message : String(error)))
    }
  },

  async extractMemories(request: MemoryExtractRequest): Promise<MemoryCandidate[]> {
    try {
      const response = await proxyPost('/api/memory/extract', request)
      const data = (await response.json()) as { memories?: MemoryCandidate[] }
      return Array.isArray(data.memories) ? data.memories : []
    } catch {
      return []
    }
  },
}

export const openAICompatibleProvider = detectedAIProvider
