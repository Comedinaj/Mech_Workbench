import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const RATE_LIMIT_MAX = 20
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

const SYSTEM_PROMPT = `You are a parametric CAD code generator. Your only output is valid OpenJSCAD JavaScript using the @jscad/modeling API.

Rules:
1. Return ONLY valid JavaScript code — no markdown fences, no explanation, no comments outside the code.
2. The code MUST define exports.main as a function that returns a JSCAD geometry or array of geometries.
3. Parameters the user can adjust must be declared at the TOP of the file with the prefix "input_", e.g.:
     const input_width = 10;  // slider min=1 max=100 step=1
     const input_shape = 'cube'; // options cube|sphere|cylinder
4. Use only @jscad/modeling primitives and transforms via the injected "jscad" variable or require('@jscad/modeling').
5. Keep the code concise and always return valid geometry.`

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

function stripFences(text) {
  return text.replace(/^```(?:javascript|js)?\n?/i, '').replace(/```\s*$/i, '').trim()
}

function todayKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function endOfDayEpoch() {
  const now = new Date()
  const eod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.floor(eod.getTime() / 1000)
}

export default async function handler(req, res) {
  const allowedOrigin = 'https://yourapp.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' })
  }

  const { prompt, conversationHistory = [] } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: '"prompt" string is required' })
  }

  const redis = getRedis()

  // --- Prompt cache check (cached hits bypass rate limit) ---
  const promptHash = createHash('sha256').update(prompt).digest('hex')
  const cacheKey = `promptcache:${promptHash}`
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return res.status(200).json({ jscadSource: cached, cached: true })
      }
    } catch (_) { /* redis unavailable — continue without cache */ }
  }

  // --- Rate limiting ---
  const ip = getClientIp(req)
  const rateLimitKey = `ratelimit:${ip}:${todayKey()}`
  if (redis) {
    try {
      const count = await redis.incr(rateLimitKey)
      if (count === 1) {
        await redis.expireat(rateLimitKey, endOfDayEpoch())
      }
      if (count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
      }
    } catch (_) { /* redis unavailable — allow request */ }
  }

  // --- Build Gemini request body ---
  const contents = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: prompt }] },
  ]

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 2048 },
  }

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return res.status(502).json({ error: `Gemini API error: ${errText}` })
    }

    const data = await geminiRes.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jscadSource = stripFences(raw)

    if (redis) {
      try {
        await redis.set(cacheKey, jscadSource, { ex: CACHE_TTL_SECONDS })
      } catch (_) { /* ignore cache write failure */ }
    }

    return res.status(200).json({ jscadSource, cached: false })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
