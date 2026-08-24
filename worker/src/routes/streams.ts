import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'

const app = new Hono<{ Bindings: Env }>()

// GET /api/streams — list active streams
app.get('/', async (c) => {
  const db = getDb(c.env.D1)
  const status = c.req.query('status') || 'live'

  const streams = await db.query(
    'SELECT s.*, u.display_name as creator_name, u.avatar_url as creator_avatar FROM streams s JOIN users u ON s.user_id = u.id WHERE s.status = ? ORDER BY s.viewer_count DESC',
    [status]
  )
  return c.json({ streams })
})

// GET /api/streams/:id — get stream details
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env.D1)

  const stream = await db.queryOne(
    'SELECT s.*, u.display_name as creator_name FROM streams s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
    [id]
  )
  if (!stream) {
    return c.json({ error: 'Stream not found' }, 404)
  }

  const recentTips = await db.query(
    'SELECT t.*, sender.display_name as sender_name FROM tips t JOIN users sender ON t.sender_id = sender.id WHERE t.stream_id = ? ORDER BY t.created_at DESC LIMIT 20',
    [id]
  )

  return c.json({ stream, recentTips })
})

// POST /api/streams — create a new stream (creator only)
app.post('/', async (c) => {
  const body = await c.req.json<{ title: string; description?: string; channel_id?: string }>()
  const userId = c.req.header('X-User-Id')

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = getDb(c.env.D1)

  // Check if user is a creator
  const user = await db.queryOne<{ is_creator: number }>('SELECT is_creator FROM users WHERE id = ?', [userId])
  if (!user?.is_creator) {
    return c.json({ error: 'Creator access required' }, 403)
  }

  const result = await db.exec(
    'INSERT INTO streams (user_id, channel_id, title, description, status, viewer_count, peak_viewers, total_tips_stars, total_tips_usd) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0)',
    [userId, body.channel_id || null, body.title, body.description || null, 'pending']
  )

  const streamId = result.meta?.last_row_id
  return c.json({ success: true, streamId: String(streamId) }, 201)
})

// PATCH /api/streams/:id/status — update stream status
app.patch('/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: string; hls_url?: string }>()
  const userId = c.req.header('X-User-Id')

  const db = getDb(c.env.D1)
  const stream = await db.queryOne<{ user_id: string }>('SELECT user_id FROM streams WHERE id = ?', [id])

  if (!stream || stream.user_id !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await db.exec(
    'UPDATE streams SET status = ?, hls_url = ?, started_at = CASE WHEN ? = "live" THEN datetime("now") ELSE started_at END, ended_at = CASE WHEN ? = "ended" THEN datetime("now") ELSE ended_at END WHERE id = ?',
    [body.status, body.hls_url || null, body.status, body.status, id]
  )

  return c.json({ success: true })
})

export { app as streamRoutes }
