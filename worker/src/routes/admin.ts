import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { requireAdmin } from '../lib/auth'

const app = new Hono<{ Bindings: Env }>()

// Middleware: constant-time, fail-closed admin secret check (lib/auth.ts).
app.use('*', requireAdmin)

// GET /api/admin/users — list all users
app.get('/users', async (c) => {
  const db = getDb(c.env.D1)
  const users = await db.query('SELECT id, telegram_id, username, display_name, is_creator, is_admin, verified, balance_stars, balance_rtv, created_at FROM users ORDER BY created_at DESC LIMIT 100')
  return c.json({ users })
})

// GET /api/admin/payouts — list pending payouts
app.get('/payouts', async (c) => {
  const db = getDb(c.env.D1)
  const status = c.req.query('status') || 'pending'
  const payouts = await db.query(
    'SELECT p.*, u.display_name, u.username FROM payouts p JOIN users u ON p.user_id = u.id WHERE p.status = ? ORDER BY p.requested_at DESC',
    [status]
  )
  return c.json({ payouts })
})

// PATCH /api/admin/payouts/:id — update payout status
app.patch('/payouts/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status: string; notes?: string }>()

  const allowed = ['pending', 'processing', 'completed', 'failed']
  if (!allowed.includes(body.status)) {
    return c.json({ error: `status must be one of: ${allowed.join(', ')}` }, 400)
  }

  const db = getDb(c.env.D1)
  await db.exec(
    'UPDATE payouts SET status = ?, notes = ?, processed_at = datetime("now") WHERE id = ?',
    [body.status, body.notes || null, id]
  )

  return c.json({ success: true })
})

// GET /api/admin/analytics — platform stats
app.get('/analytics', async (c) => {
  const db = getDb(c.env.D1)

  const [userCount, creatorCount, streamCount, tipTotal, payoutPending] = await Promise.all([
    db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE is_creator = 1'),
    db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM streams WHERE status = "live"'),
    db.queryOne<{ total: number }>('SELECT COALESCE(SUM(amount_usd), 0) as total FROM tips'),
    db.queryOne<{ total: number }>('SELECT COALESCE(SUM(amount_usd), 0) as total FROM payouts WHERE status = "pending"'),
  ])

  return c.json({
    users: userCount?.count || 0,
    creators: creatorCount?.count || 0,
    liveStreams: streamCount?.count || 0,
    totalTipsUsd: tipTotal?.total || 0,
    pendingPayoutsUsd: payoutPending?.total || 0,
  })
})

export { app as adminRoutes }
