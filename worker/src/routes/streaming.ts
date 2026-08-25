import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { CloudflareStreamClient } from '../streaming/cloudflareStream'
import { requireAdmin } from '../lib/auth'
import { verifySessionToken } from '../lib/sessionToken'
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

// ===== LIVE INPUTS (admin only — creates/destroys billable CF resources) =====
//
// SECURITY: live inputs contain RTMPS/SRT stream keys. They were previously
// creatable, deletable, and LISTED (SELECT *, keys included) by anyone.
// Keys are returned exactly once, at creation time, to the admin caller.

app.post('/live-inputs', requireAdmin, async (c) => {
  const body = await c.req.json() as { name: string; channelId?: string; meta?: Record<string, string> }
  const client = new CloudflareStreamClient(c.env)

  const input = await client.createLiveInput(body.name, {
    channel_id: body.channelId || '',
    ...body.meta
  })

  // Store in D1 — keys are stored for operational use but never listed back out.
  const db = getDb(c.env.D1)
  await db.exec(
    `INSERT INTO cloudflare_live_inputs (uid, name, channel_id, rtmps_url, srt_url, webrtc_url, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [input.uid, body.name, body.channelId || null, input.rtmps.url, input.srt.url, input.webRTC.url]
  )

  // One-time key disclosure to the authenticated admin.
  return c.json({ success: true, input })
})

app.get('/live-inputs', requireAdmin, async (c) => {
  const db = getDb(c.env.D1)
  // Never return ingest keys in a list response.
  const rows = await db.query<Record<string, unknown>>(
    'SELECT uid, name, channel_id, status, created_at FROM cloudflare_live_inputs ORDER BY created_at DESC'
  )
  return c.json({ inputs: rows })
})

app.delete('/live-inputs/:uid', requireAdmin, async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  await client.deleteLiveInput(uid)

  const db = getDb(c.env.D1)
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

app.delete('/vod/:uid', requireAdmin, async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  await client.deleteVideo(uid)
  return c.json({ success: true })
})

// ===== TOKEN-GATED PLAYBACK =====
//
// Fail-closed: when content requires an RTV token, the viewer MUST present a
// verified session token. Previously `c.get('userId')` was always undefined
// (no middleware set it on this route), so the balance check was silently
// skipped and gated content was free.

app.get('/playback/:uid', async (c) => {
  const uid = c.req.param('uid')
  const requireToken = c.req.query('requireToken') === 'true'
  const tokenExpiry = c.req.query('tokenExpiry') ? parseInt(c.req.query('tokenExpiry')!) : 3600

  const db = getDb(c.env.D1)
  const content = await db.queryOne<{ requires_token: number; token_cost_rtv: number }>(
    'SELECT requires_token, token_cost_rtv FROM vod WHERE cf_stream_uid = ?',
    [uid]
  )

  const needsToken = requireToken || content?.requires_token === 1

  if (needsToken) {
    // Fail closed: gated content requires authentication — no silent skip.
    const secret = c.env.JWT_SECRET
    if (!secret) {
      return c.json({ error: 'Server misconfigured: JWT_SECRET is not set' }, 500)
    }
    const header = c.req.header('Authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(header.trim())
    if (!match) {
      return c.json({ error: 'Unauthorized: this content requires authentication' }, 401)
    }
    const payload = await verifySessionToken(match[1], secret)
    if (!payload) {
      return c.json({ error: 'Unauthorized: invalid or expired session token' }, 401)
    }

    const user = await db.queryOne<{ balance_rtv: number; is_admin: number }>(
      'SELECT balance_rtv, is_admin FROM users WHERE id = ?',
      [payload.uid]
    )
    const cost = content?.token_cost_rtv || 0
    if (!user) {
      return c.json({ error: 'Unknown user' }, 401)
    }
    if (!user.is_admin && user.balance_rtv < cost) {
      return c.json({ error: 'Insufficient RTV balance', required: cost, balance: user.balance_rtv }, 402)
    }
  }

  const client = new CloudflareStreamClient(c.env)
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

// ===== ANALYTICS (admin only) =====

app.get('/analytics/:uid/views', requireAdmin, async (c) => {
  const uid = c.req.param('uid')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const client = new CloudflareStreamClient(c.env)
  const views = await client.getVideoViews(uid, start, end)
  return c.json({ uid, views, start, end })
})

export default app
