import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

const RATE_LIMIT_WINDOW = 60 // seconds
const RATE_LIMIT_MAX = 100 // requests per window

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const kv = c.env.KV_RATE_LIMIT
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `rate:${ip}`

  // Graceful degradation: if KV is unavailable, allow request through
  if (!kv) {
    await next()
    return
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW
    const windowKey = `${key}:${windowStart}`

    const current = await kv.get(windowKey)
    const count = current ? parseInt(current, 10) : 0

    if (count >= RATE_LIMIT_MAX) {
      c.header('Retry-After', String(RATE_LIMIT_WINDOW))
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }

    await kv.put(windowKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 })
    await next()
  } catch {
    // Graceful degradation: if KV fails, allow request through
    await next()
  }
})
