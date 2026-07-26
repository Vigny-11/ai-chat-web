import cors from 'cors'
import express from 'express'
import { maskSecrets } from './utils/errors'
import { providerDetector } from './services/providers/ProviderDetector'
import type { ProviderId, ServerAIProvider } from './services/providers/AIProvider'

const app = express()
const port = Number(process.env.SERVER_PORT || 8787)
const allowed = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((item) => item.trim())

const buckets = new Map<string, { count: number; resetAt: number }>()

app.use(express.json({ limit: '2mb' }))
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowed.includes(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) callback(null, true)
      else callback(new Error('当前接口不支持跨域'))
    },
  }),
)

app.use((req, res, next) => {
  const key = req.ip || 'local'
  const now = Date.now()
  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + 60_000 }
  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + 60_000
  }
  bucket.count += 1
  buckets.set(key, bucket)
  if (bucket.count > 90) return res.status(429).send('请求过于频繁，请稍后再试')
  next()
})

const resolveProvider = async (apiKey: string, providerId?: ProviderId) => {
  if (!apiKey) throw new Error('API Key 无效，请重新输入')
  return providerDetector.resolve(apiKey, providerId)
}

const writeStream = async (res: express.Response, upstream: Response, provider: ServerAIProvider) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  const reader = upstream.body?.getReader()
  if (!reader) throw new Error('AI 服务暂时不可用，请稍后重试')
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    for (const line of text.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') {
        res.write('data: [DONE]\n\n')
        continue
      }
      try {
        const json = JSON.parse(payload)
        const content = provider.extractContent(json)
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`)
      } catch {
        res.write(`data: ${JSON.stringify({ content: payload })}\n\n`)
      }
    }
  }
  res.end()
}

app.post('/api/provider/detect', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(401).json({ ok: false, message: 'API Key 无效，请重新输入' })
    res.json(await providerDetector.detect(apiKey))
  } catch (error) {
    res.status(400).json({ ok: false, message: maskSecrets(error instanceof Error ? error.message : String(error)) })
  }
})

app.post('/api/test', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(401).json({ ok: false, message: 'API Key 无效，请重新输入' })
    res.json(await providerDetector.detect(apiKey))
  } catch (error) {
    res.status(400).json({ ok: false, message: maskSecrets(error instanceof Error ? error.message : String(error)) })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { apiKey, providerId, messages } = req.body as { apiKey: string; providerId?: ProviderId; messages: unknown[] }
    const provider = await resolveProvider(apiKey, providerId)
    const upstream = await provider.chat(apiKey, messages, true)
    await writeStream(res, upstream, provider)
  } catch (error) {
    res.status(400).send(maskSecrets(error instanceof Error ? error.message : String(error)))
  }
})

app.post('/api/memory/extract', async (req, res) => {
  try {
    const { apiKey, providerId, messages, character } = req.body as { apiKey: string; providerId?: ProviderId; messages: unknown[]; character?: { name?: string } }
    const provider = await resolveProvider(apiKey, providerId)
    const prompt = `你是长期记忆提取器。请从最近聊天中提取对后续角色扮演有长期价值的信息。只返回 JSON，格式为 {"memories":[{"type":"user|relationship|character_growth|world_event","title":"标题","content":"内容","importance":1-5}]}。不要返回解释。角色名：${character?.name ?? ''}`
    const upstream = await provider.chat(
      apiKey,
      [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(messages ?? []) },
      ],
      false,
      900,
    )
    const data = await upstream.json()
    const text = provider.extractContent(data) || '{"memories":[]}'
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{"memories":[]}')
    res.json({ memories: Array.isArray(parsed.memories) ? parsed.memories : [] })
  } catch {
    res.json({ memories: [] })
  }
})

app.listen(port, '127.0.0.1', () => {
  console.log(`AI聊天系统本地代理已启动：http://127.0.0.1:${port}`)
})
