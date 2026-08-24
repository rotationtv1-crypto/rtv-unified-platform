import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { CloudflareStreamClient } from '../streaming/cloudflareStream'
import { createMiddleware } from 'hono/factory'

const app = new Hono<{ Bindings: Env }>()

// Middleware: require Cloudflare Stream credentials
const requireStreamCreds = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.CF_STREAM_API_TOKEN || !c.env.CF_ACCOUNT_ID) {
    return c.json({ error: 'Cloudflare Stream not configured' }, 503)
  }
  await next()
})

app.use('*', requireStreamCreds)

// ===== LIVE INPUTS =====

app.post('/live-inputs', async (c) => {
  const body = await c.req.json() as { name: string; channelId?: string; meta?: Record<string, string> }
  const client = new CloudflareStreamClient(c.env)

  const input = await client.createLiveInput(body.name, {
    channel_id: body.channelId || '',
    ...body.meta
  })

  // Store in D1
  const db = getDb(c.env.DB)
  await db.exec(
    `INSERT INTO cloudflare_live_inputs (uid, name, channel_id, rtmps_url, srt_url, webrtc_url, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [input.uid, body.name, body.channelId || null, input.rtmps.url, input.srt.url, input.webRTC.url]
  )

  return c.json({ success: true, input })
})

app.get('/live-inputs', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.query<Record<string, unknown>>(
    'SELECT * FROM cloudflare_live_inputs ORDER BY created_at DESC'
  )
  return c.json({ inputs: rows })
})

app.delete('/live-inputs/:uid', async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  await client.deleteLiveInput(uid)

  const db = getDb(c.env.DB)
  await db.exec('UPDATE cloudflare_live_inputs SET status = ? WHERE uid = ?', ['deleted', uid])

  return c.json({ success: true })
})

// ===== VOD =====

app.get('/vod', async (c) => {
  const client = new CloudflareStreamClient(c.env)
  const videos = await client.listVideos()
  return c.json({ videos })
})

app.get('/vod/:uid', async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  const video = await client.getVideo(uid)
  return c.json({ video })
})

app.delete('/vod/:uid', async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  await client.deleteVideo(uid)
  return c.json({ success: true })
})

// ===== TOKEN-GATED PLAYBACK =====

app.get('/playback/:uid', async (c) => {
  const uid = c.req.param('uid')
  const requireToken = c.req.query('requireToken') === 'true'
  const tokenExpiry = c.req.query('tokenExpiry') ? parseInt(c.req.query('tokenExpiry')!) : 3600

  const client = new CloudflareStreamClient(c.env)

  // Check if content requires RTV token
  const db = getDb(c.env.DB)
  const content = await db.queryOne<{ requires_token: number; token_cost_rtv: number }>(
    'SELECT requires_token, token_cost_rtv FROM vod WHERE cf_stream_uid = ?',
    [uid]
  )

  const needsToken = requireToken || content?.requires_token === 1

  if (needsToken) {
    // Verify user has enough RTV balance (if not admin)
    const userId = c.get('userId') as string | undefined
    if (userId) {
      const user = await db.queryOne<{ balance_rtv: number; is_admin: number }>(
        'SELECT balance_rtv, is_admin FROM users WHERE id = ?',
        [userId]
      )
      const cost = content?.token_cost_rtv || 0
      if (user && !user.is_admin && user.balance_rtv < cost) {
        return c.json({ error: 'Insufficient RTV balance', required: cost, balance: user.balance_rtv }, 402)
      }
    }
  }

  const urls = await client.getPlaybackUrl(uid, undefined, {
    requireToken: needsToken,
    tokenExpirySeconds: tokenExpiry
  })

  return c.json({
    uid,
    ...urls,
    requiresToken: needsToken,
    tokenCost: content?.token_cost_rtv || 0
  })
})

// ===== STREAM HEALTH =====

app.get('/health/:uid', async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  const health = await client.getStreamHealth(uid)
  return c.json({ uid, ...health })
})

// ===== ANALYTICS =====

app.get('/analytics/:uid/views', async (c) => {
  const uid = c.req.param('uid')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const client = new CloudflareStreamClient(c.env)
  const views = await client.getVideoViews(uid, start, end)
  return c.json({ uid, views, start, end })
})

export default app
