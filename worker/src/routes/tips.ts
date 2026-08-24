import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'

const app = new Hono<{ Bindings: Env }>()

// POST /api/tips — send a tip/gift
app.post('/', async (c) => {
  const body = await c.req.json<{
    stream_id: string
    receiver_id: string
    gift_type: string
    gift_emoji: string
    amount_stars: number
    message?: string
    is_anonymous?: boolean
  }>()
  const senderId = c.req.header('X-User-Id')

  if (!senderId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = getDb(c.env.D1)

  // Verify sender has enough balance
  const sender = await db.queryOne<{ balance_stars: number; is_creator: number }>(
    'SELECT balance_stars, is_creator FROM users WHERE id = ?',
    [senderId]
  )
  if (!sender || sender.balance_stars < body.amount_stars) {
    return c.json({ error: 'Insufficient Stars balance' }, 400)
  }

  const amountUsd = body.amount_stars * 0.013  // ~$0.013 per Star

  await db.exec('BEGIN TRANSACTION')
  try {
    // Deduct from sender
    await db.exec('UPDATE users SET balance_stars = balance_stars - ? WHERE id = ?', [body.amount_stars, senderId])

    // Add to receiver
    await db.exec(
      'UPDATE users SET balance_stars = balance_stars + ?, balance_rtv = balance_rtv + ? WHERE id = ?',
      [body.amount_stars, Math.floor(amountUsd * 10), body.receiver_id]
    )

    // Record tip
    const tipResult = await db.exec(
      'INSERT INTO tips (stream_id, sender_id, receiver_id, gift_type, gift_emoji, amount_stars, amount_usd, message, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        body.stream_id || null,
        senderId,
        body.receiver_id,
        body.gift_type,
        body.gift_emoji,
        body.amount_stars,
        amountUsd,
        body.message || null,
        body.is_anonymous ? 1 : 0,
      ]
    )

    // Update stream totals if applicable
    if (body.stream_id) {
      await db.exec(
        'UPDATE streams SET total_tips_stars = total_tips_stars + ?, total_tips_usd = total_tips_usd + ? WHERE id = ?',
        [body.amount_stars, amountUsd, body.stream_id]
      )
    }

    await db.exec('COMMIT')

    return c.json({
      success: true,
      tipId: String(tipResult.meta?.last_row_id),
      amountStars: body.amount_stars,
      amountUsd,
    }, 201)
  } catch (err) {
    await db.exec('ROLLBACK')
    throw err
  }
})

export { app as tipRoutes }
