import { resolveRuntimeProvider, streamToClient } from '../../src/services/providers/ServerProviderRuntime'

type PagesContext = {
  request: Request
}

type ChatBody = {
  apiKey?: string
  providerId?: string
  messages?: Array<{ role: string; content: string }>
  characterContext?: string
  memory?: string
}

const buildMessages = (body: ChatBody) => {
  const messages = Array.isArray(body.messages) ? body.messages : []
  const context: string[] = []
  if (body.characterContext?.trim()) context.push(`角色资料：\n${body.characterContext.trim()}`)
  if (body.memory?.trim()) context.push(`长期记忆：\n${body.memory.trim()}`)
  if (!context.length) return messages
  return [{ role: 'system', content: context.join('\n\n') }, ...messages]
}

export const onRequestPost = async ({ request }: PagesContext) => {
  try {
    const body = (await request.json()) as ChatBody
    if (!body.apiKey?.trim()) return Response.json({ success: false, message: 'API Key 无效，请重新输入' }, { status: 401 })
    const provider = await resolveRuntimeProvider(body.apiKey, body.providerId)
    const upstream = await provider.chat(body.apiKey, buildMessages(body), true)
    return new Response(streamToClient(upstream, provider), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试' },
      { status: 400 },
    )
  }
}

export const onRequest = async ({ request }: PagesContext) => {
  if (request.method !== 'POST') return Response.json({ success: false, message: '仅支持 POST 请求' }, { status: 405 })
  return onRequestPost({ request })
}
