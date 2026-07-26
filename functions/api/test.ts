import { detectRuntimeProvider } from '../../src/services/providers/ServerProviderRuntime'

type PagesContext = {
  request: Request
}

export const onRequestPost = async ({ request }: PagesContext) => {
  try {
    const body = (await request.json()) as { apiKey?: string }
    const result = await detectRuntimeProvider(body.apiKey ?? '')
    if (!result.success) {
      return Response.json({ success: false, message: result.message ?? 'AI 服务暂时不可用，请稍后重试' }, { status: 400 })
    }
    return Response.json({ success: true, provider: result.provider })
  } catch {
    return Response.json({ success: false, message: '请求格式不正确' }, { status: 400 })
  }
}

export const onRequest = async ({ request }: PagesContext) => {
  if (request.method !== 'POST') return Response.json({ success: false, message: '仅支持 POST 请求' }, { status: 405 })
  return onRequestPost({ request })
}
