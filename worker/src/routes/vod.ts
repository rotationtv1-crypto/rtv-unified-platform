import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'

const app = new Hono<{ Bindings: Env }>()

// GET /api/vod — list VOD content (public)
app.get('/', async (c) => {
  const db = getDb(c.env.D1)
  const category = c.req.query('category')
  const search = c.req.query('search')

  let sql = 'SELECT v.*, u.display_name as creator_name FROM vod v JOIN users u ON v.user_id = u.id WHERE v.is_public = 1'
  const params: unknown[] = []

  if (category) {
    sql += ' AND v.category = ?'
    params.push(category)
  }
  if (search) {
    sql += ' AND (v.title LIKE ? OR v.tags LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  sql += ' ORDER BY v.created_at DESC LIMIT 50'

  const items = await db.query(sql, params)
  return c.json({ items })
})

// GET /api/vod/:id — get VOD details (public)
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env.D1)

  const item = await db.queryOne(
    'SELECT v.*, u.display_name as creator_name FROM vod v JOIN users u ON v.user_id = u.id WHERE v.id = ?',
    [id]
  )
  if (!item) {
    return c.json({ error: 'VOD not found' }, 404)
  }

  return c.json({ item })
})

// POST /api/vod — upload VOD metadata (authenticated)
app.post('/', requireAuth, async (c) => {
  const body = await c.req.json<{
    title: string
    description?: string
    video_url: string
    duration_seconds: number
    category: string
    tags?: string
  }>()
  const userId = c.get('userId') as string

  const db = getDb(c.env.D1)
  const result = await db.exec(
    'INSERT INTO vod (user_id, title, description, video_url, duration_seconds, category, tags, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [userId, body.title, body.description || null, body.video_url, body.duration_seconds, body.category, body.tags || '']
  )

  return c.json({ success: true, vodId: String(result.meta?.last_row_id) }, 201)
})

export { app as vodRoutes }
