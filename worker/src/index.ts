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

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: ['https://rotationtv.network', 'https://*.pages.dev', 'https://*.workers.dev', 'https://t.me', 'https://*.kimi.page'],
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
