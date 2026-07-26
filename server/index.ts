import cors from 'cors'
import express from 'express'
import { requestOpenAI } from './services/openaiProxy'
import { maskSecrets } from './utils/errors'

const app = express()
const port = Number(process.env.SERVER_PORT || 8787)
const defaultAIConfig = {
  baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com',
  apiPath: process.env.AI_API_PATH || '/v1/chat/completions',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.8,
  topP: 0.9,
  timeoutMs: 30000,
  stream: true,
}
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

app.post('/api/test', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(401).json({ ok: false, message: 'API Key 无效' })
    await requestOpenAI(
      { ...defaultAIConfig, maxTokens: 8, stream: false },
      apiKey,
      [{ role: 'user', content: '请只回复“连接成功”。' }],
      false,
    )
    res.json({ ok: true, message: 'API 连接成功，可以开始创建角色。' })
  } catch (error) {
    res.status(400).json({ ok: false, message: maskSecrets(error instanceof Error ? error.message : String(error)) })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { apiKey, messages } = req.body
    if (!apiKey) return res.status(401).send('API Key 无效')
    const upstream = await requestOpenAI(defaultAIConfig, apiKey, messages, true)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    const reader = upstream.body?.getReader()
    if (!reader) throw new Error('接口未返回流式内容')
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
          const content = json.choices?.[0]?.delta?.content ?? ''
          if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`)
        } catch {
          res.write(`data: ${JSON.stringify({ content: payload })}\n\n`)
        }
      }
    }
    res.end()
  } catch (error) {
    res.status(400).send(maskSecrets(error instanceof Error ? error.message : String(error)))
  }
})

app.post('/api/memory/extract', async (req, res) => {
  try {
    const { apiKey, messages, character } = req.body
    const prompt = `你是长期记忆提取器。请从最近聊天中提取对后续角色扮演有长期价值的信息。只返回 JSON，格式为 {"memories":[{"type":"user|relationship|character_growth|world_event","title":"标题","content":"内容","importance":1-5}]}。不要返回解释。角色名：${character?.name ?? ''}`
    const upstream = await requestOpenAI(
      { ...defaultAIConfig, maxTokens: 900, stream: false },
      apiKey,
      [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(messages ?? []) },
      ],
      false,
    )
    const data = await upstream.json()
    const text = data.choices?.[0]?.message?.content ?? '{"memories":[]}'
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{"memories":[]}')
    res.json({ memories: Array.isArray(parsed.memories) ? parsed.memories : [] })
  } catch {
    res.json({ memories: [] })
  }
})

app.listen(port, '127.0.0.1', () => {
  console.log(`AI聊天系统本地代理已启动：http://127.0.0.1:${port}`)
})
