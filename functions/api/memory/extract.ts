import { resolveRuntimeProvider } from '../../../src/services/providers/ServerProviderRuntime'

type PagesContext = {
  request: Request
}

type MemoryBody = {
  apiKey?: string
  providerId?: string
  messages?: unknown[]
  character?: { name?: string }
}

export const onRequestPost = async ({ request }: PagesContext) => {
  try {
    const body = (await request.json()) as MemoryBody
    if (!body.apiKey?.trim()) return Response.json({ memories: [] })
    const provider = await resolveRuntimeProvider(body.apiKey, body.providerId)
    const prompt = `你是长期记忆提取器。请从最近聊天中提取对后续角色扮演有长期价值的信息。只返回 JSON，格式为 {"memories":[{"type":"user|relationship|character_growth|world_event","title":"标题","content":"内容","importance":1-5}]}。不要返回解释。角色名：${body.character?.name ?? ''}`
    const upstream = await provider.chat(
      body.apiKey,
      [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(body.messages ?? []) },
      ],
      false,
      900,
    )
    const data = await upstream.json()
    const text = provider.extractContent(data) || '{"memories":[]}'
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{"memories":[]}')
    return Response.json({ memories: Array.isArray(parsed.memories) ? parsed.memories : [] })
  } catch {
    return Response.json({ memories: [] })
  }
}

export const onRequest = async ({ request }: PagesContext) => {
  if (request.method !== 'POST') return Response.json({ memories: [] }, { status: 405 })
  return onRequestPost({ request })
}
