import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { Env } from './types'
import { channelRoutes } from './routes/channels'
import { streamRoutes } from './routes/streams'
import { vodRoutes } from './routes/vod'
import { tipRoutes } from './routes/tips'
import { authRoutes } from './routes/auth'
import { payoutRoutes } from './routes/payouts'
import { adminRoutes } from './routes/admin'
import { healthRoute } from './routes/health'
import { rateLimitMiddleware } from './lib/rateLimit'
import { errorHandler } from './lib/errorHandler'
import telegramRoutes from './routes/telegram'
import streamingRoutes from './routes/streaming'

const EXACT_ORIGINS = new Set([
  'https://rotationtv.network',
  'https://www.rotationtv.network',
  'https://app.rotationtv.network',
  'https://t.me',
])

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (EXACT_ORIGINS.has(origin)) return true
    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1') return true
    return (
      host.endsWith('.pages.dev') ||
      host.endsWith('.workers.dev') ||
      host.endsWith('.kimi.page')
    )
  } catch {
    return false
  }
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: (origin) => (origin && isAllowedOrigin(origin) ? origin : ''),
  allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Bot-Id'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', rateLimitMiddleware)

app.route('/', healthRoute)
app.route('/api/auth', authRoutes)
app.route('/api/channels', channelRoutes)
app.route('/api/streams', streamRoutes)
app.route('/api/vod', vodRoutes)
app.route('/api/tips', tipRoutes)
app.route('/api/payouts', payoutRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/streaming', streamingRoutes)
app.route('/telegram', telegramRoutes)

app.onError(errorHandler)
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

export default app
