import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { validateTelegramInitData } from '../lib/telegramAuth'

const app = new Hono<{ Bindings: Env }>()

// POST /api/auth/telegram — validate initData and create/get user
app.post('/telegram', async (c) => {
  const body = await c.req.json<{ initData: string }>()
  const { initData } = body

  if (!initData) {
    return c.json({ error: 'Missing initData' }, 400)
  }

  const tgUser = validateTelegramInitData(initData, c.env.TELEGRAM_BOT_TOKEN)
  if (!tgUser) {
    return c.json({ error: 'Invalid Telegram init data' }, 401)
  }

  const db = getDb(c.env.D1)

  let user = await db.queryOne<{ id: string }>(
    'SELECT id FROM users WHERE telegram_id = ?',
    [String(tgUser.id)]
  )

  if (!user) {
    const result = await db.exec(
      `INSERT INTO users (telegram_id, username, display_name, avatar_url, is_creator, is_admin, verified, balance_stars, balance_rtv)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(tgUser.id),
        tgUser.username || null,
        tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
        null,
        0,
        0,
        0,
        0,
        0,
      ]
    )
    const userId = result.meta?.last_row_id
    if (!userId) {
      return c.json({ error: 'Failed to create user' }, 500)
    }
    user = { id: String(userId) }
  }

  const fullUser = await db.queryOne<{
    id: string
    telegram_id: string
    username: string
    display_name: string
    is_creator: number
    is_admin: number
    balance_stars: number
    balance_rtv: number
  }>('SELECT * FROM users WHERE id = ?', [user.id])

  return c.json({
    success: true,
    user: {
      id: fullUser?.id,
      telegramId: fullUser?.telegram_id,
      username: fullUser?.username,
      displayName: fullUser?.display_name,
      isCreator: !!fullUser?.is_creator,
      isAdmin: !!fullUser?.is_admin,
      balanceStars: fullUser?.balance_stars,
      balanceRtv: fullUser?.balance_rtv,
    },
    token: `rtv_${Buffer.from(`${fullUser?.id}:${Date.now()}`).toString('base64')}`,
  })
})

export { app as authRoutes }
