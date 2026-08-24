import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'

const app = new Hono<{ Bindings: Env }>()

// GET /api/channels — list all channels (FAST + Live)
app.get('/', async (c) => {
  const db = getDb(c.env.D1)
  const category = c.req.query('category')
  const isLive = c.req.query('is_live')

  let sql = 'SELECT * FROM channels WHERE 1=1'
  const params: unknown[] = []

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (isLive !== undefined) {
    sql += ' AND is_live = ?'
    params.push(isLive === 'true' ? 1 : 0)
  }

  sql += ' ORDER BY viewer_count DESC'

  const channels = await db.query(sql, params)
  return c.json({ channels })
})

// GET /api/channels/:slug — get single channel
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.D1)

  const channel = await db.queryOne('SELECT * FROM channels WHERE slug = ?', [slug])
  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404)
  }

  // Get current program for FAST channels
  let currentProgram = null
  if (channel.is_fast) {
    const now = new Date().toISOString()
    currentProgram = await db.queryOne(
      'SELECT * FROM programs WHERE channel_id = ? AND start_time <= ? AND end_time >= ? ORDER BY start_time DESC LIMIT 1',
      [channel.id, now, now]
    )
  }

  return c.json({ channel, currentProgram })
})

export { app as channelRoutes }
