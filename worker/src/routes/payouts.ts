import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'

const app = new Hono<{ Bindings: Env }>()

// GET /api/payouts — list user's payouts
app.get('/', async (c) => {
  const userId = c.req.header('X-User-Id')
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

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
  const userId = c.req.header('X-User-Id')

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
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
      [userId, body.amount_usd, rtvNeeded, body.method, body.destination, 'pending']
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
