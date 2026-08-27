import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { CloudflareStreamClient } from '../streaming/cloudflareStream'
import { createMiddleware } from 'hono/factory'

const app = new Hono<{ Bindings: Env }>()

const requireStreamCreds = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.CF_STREAM_API_TOKEN || !c.env.CF_ACCOUNT_ID) {
    return c.json({ error: 'Cloudflare Stream management API is not configured' }, 503)
  }
  await next()
})

const requireAdmin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const expected = c.env.ADMIN_SECRET
  if (!expected) {
    return c.json({ error: 'Admin secret is not configured' }, 503)
  }
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// Hono `/*` does not match the collection path itself.
app.use('/live-inputs', requireStreamCreds)
app.use('/live-inputs/*', requireStreamCreds)
app.use('/vod', requireStreamCreds)
app.use('/vod/*', requireStreamCreds)
app.use('/health/*', requireStreamCreds)
app.use('/analytics/*', requireStreamCreds)

app.post('/live-inputs', requireAdmin, async (c) => {
  const body = await c.req.json() as { name: string; channelId?: string; meta?: Record<string, string> }
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)

  const client = new CloudflareStreamClient(c.env)
  const input = await client.createLiveInput(body.name.trim(), {
    channel_id: body.channelId || '',
    ...body.meta
  })

  const db = getDb(c.env.DB)
  await db.exec(
    `INSERT INTO cloudflare_live_inputs (uid, name, channel_id, rtmps_url, srt_url, webrtc_url, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [input.uid, body.name.trim(), body.channelId || null, input.rtmps.url, input.srt.url, input.webRTC.url]
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

app.delete('/live-inputs/:uid', requireAdmin, async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  await client.deleteLiveInput(uid)

  const db = getDb(c.env.DB)
  await db.exec('UPDATE cloudflare_live_inputs SET status = ? WHERE uid = ?', ['deleted', uid])

  return c.json({ success: true })
})

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

/**
 * Safe server-side playback endpoint.
 *
 * The browser receives only a short-lived signed manifest URL. The Stream
 * binding performs token generation inside the Worker, so neither the
 * Cloudflare API token nor a signing key is exposed to the client.
 */
app.get('/playback/:uid', async (c) => {
  const uid = c.req.param('uid')
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(uid)) {
    return c.json({ error: 'Invalid stream id' }, 400)
  }

  const db = getDb(c.env.DB)
  const [liveInput, content] = await Promise.all([
    db.queryOne<{ uid: string; name: string; channel_id: string | null; status: string }>(
      'SELECT uid, name, channel_id, status FROM cloudflare_live_inputs WHERE uid = ? AND status != ?',
      [uid, 'deleted']
    ),
    db.queryOne<{ requires_token: number; token_cost_rtv: number }>(
      'SELECT requires_token, token_cost_rtv FROM vod WHERE cf_stream_uid = ?',
      [uid]
    )
  ])

  if (!liveInput && !content) {
    return c.json({ error: 'Stream not found' }, 404)
  }

  if (!c.env.STREAM) {
    return c.json({ error: 'Cloudflare Stream binding is not configured' }, 503)
  }

  // Always issue a short-lived signed token. This prevents the frontend from
  // embedding an unrestricted Stream URL and keeps playback authorization at
  // the API boundary.
  const token = await c.env.STREAM.video(uid).generateToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
  })

  const client = new CloudflareStreamClient(c.env)
  let hls: string
  let dash: string
  let thumbnail: string | undefined

  if (content) {
    const video = await client.getVideo(uid)
    hls = replaceStreamAssetId(video.playback.hls, token)
    dash = replaceStreamAssetId(video.playback.dash, token)
    thumbnail = replaceStreamAssetId(video.thumbnail, token)
  } else {
    const base = normalizeStreamCustomerUrl(c.env.CF_STREAM_CUSTOMER_SUBDOMAIN)
    if (!base) {
      return c.json({ error: 'Cloudflare Stream customer hostname is not configured' }, 503)
    }
    hls = `${base}/${token}/manifest/video.m3u8`
    dash = `${base}/${token}/manifest/video.mpd`
  }

  return c.json({
    uid,
    type: liveInput ? 'live' : 'vod',
    hls,
    dash,
    ...(thumbnail ? { thumbnail } : {}),
    expiresIn: 3600,
    requiresToken: true,
    tokenCost: content?.token_cost_rtv || 0,
  }, 200, {
    'Cache-Control': 'private, no-store',
  })
})

app.get('/health/:uid', async (c) => {
  const uid = c.req.param('uid')
  const client = new CloudflareStreamClient(c.env)
  const health = await client.getStreamHealth(uid)
  return c.json({ uid, ...health })
})

app.get('/analytics/:uid/views', async (c) => {
  const uid = c.req.param('uid')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const client = new CloudflareStreamClient(c.env)
  const views = await client.getVideoViews(uid, start, end)
  return c.json({ uid, views, start, end })
})

function normalizeStreamCustomerUrl(value?: string): string | null {
  if (!value) return null
  const candidate = value.startsWith('http') ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    if (!url.hostname.endsWith('.cloudflarestream.com')) return null
    return `${url.protocol}//${url.hostname}`
  } catch {
    return null
  }
}

function replaceStreamAssetId(assetUrl: string, token: string): string {
  const url = new URL(assetUrl)
  const parts = url.pathname.split('/')
  const idIndex = parts.findIndex((part) => part.length > 0)
  if (idIndex < 0) throw new Error('Invalid Cloudflare Stream playback URL')
  parts[idIndex] = token
  url.pathname = parts.join('/')
  return url.toString()
}

export default app
