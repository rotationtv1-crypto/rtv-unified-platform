import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { requireAuth } from '../lib/auth'

const app = new Hono<{ Bindings: Env }>()

// All payout routes require a verified session token. Identity comes from the
// token — never from a client-supplied X-User-Id header (any client can set
// one, which previously allowed viewing/spending anyone's balance).
app.use('*', requireAuth)

// GET /api/payouts — list the authenticated user's payouts
app.get('/', async (c) => {
  const userId = c.get('userId') as string

  const db = getDb(c.env.D1)
  const payouts = await db.query('SELECT * FROM payouts WHERE user_id = ? ORDER BY requested_at DESC', [userId])
  return c.json({ payouts })
})

// POST /api/payouts — request a payout
app.post('/', async (c) => {
  const body = await c.req.json<{
    amount_usd: number
    method: 'usdt' | 'rub' | 'eur'
    destination: string
  }>()
  const userId = c.get('userId') as string

  if (!body || typeof body.amount_usd !== 'number' || !Number.isFinite(body.amount_usd)) {
    return c.json({ error: 'amount_usd must be a finite number' }, 400)
  }
  if (!['usdt', 'rub', 'eur'].includes(body.method)) {
    return c.json({ error: 'method must be one of: usdt, rub, eur' }, 400)
  }
  if (typeof body.destination !== 'string' || body.destination.trim().length < 4) {
    return c.json({ error: 'destination is required' }, 400)
  }

  // Minimum payout thresholds
  const minAmounts = { usdt: 100, rub: 3000, eur: 100 }
  if (body.amount_usd < (minAmounts[body.method] || 100)) {
    return c.json({ error: `Minimum payout for ${body.method} is ${minAmounts[body.method]} ${body.method.toUpperCase()}` }, 400)
  }

  const db = getDb(c.env.D1)

  // Check user balance
  const user = await db.queryOne<{ balance_rtv: number }>('SELECT balance_rtv FROM users WHERE id = ?', [userId])
  const rtvNeeded = body.amount_usd * 10  // 1 USD = 10 RTV
  if (!user || user.balance_rtv < rtvNeeded) {
    return c.json({ error: 'Insufficient RTV balance' }, 400)
  }

  // Check payout frequency (max 2 on-demand per month)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const recentPayouts = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM payouts WHERE user_id = ? AND status != "failed" AND requested_at >= ?',
    [userId, monthStart.toISOString()]
  )

  if (recentPayouts && recentPayouts.count >= 2) {
    return c.json({ error: 'Maximum 2 on-demand payouts per month reached' }, 429)
  }

  // Deduct balance and create payout
  await db.exec('BEGIN TRANSACTION')
  try {
    await db.exec('UPDATE users SET balance_rtv = balance_rtv - ? WHERE id = ?', [rtvNeeded, userId])

    const result = await db.exec(
      'INSERT INTO payouts (user_id, amount_usd, amount_rtv, method, destination, status, requested_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [userId, body.amount_usd, rtvNeeded, body.method, body.destination.trim(), 'pending']
    )

    await db.exec('COMMIT')

    return c.json({
      success: true,
      payoutId: String(result.meta?.last_row_id),
      status: 'pending',
      estimatedCompletion: '3-5 business days',
    }, 201)
  } catch (err) {
    await db.exec('ROLLBACK')
    throw err
  }
})

export { app as payoutRoutes }
