import { Hono } from 'hono'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'rotationtv-api',
    version: '1.0.0',
    env: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    uptime: '100%',
    d1: !!(c.env.DB || c.env.D1),
    kv: !!c.env.KV_RATE_LIMIT,
    stream: !!c.env.STREAM,
  })
})

export { app as healthRoute }
