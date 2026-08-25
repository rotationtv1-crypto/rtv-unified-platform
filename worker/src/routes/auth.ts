/**
 * Auth routes.
 *
 * POST /telegram — Telegram Mini App login.
 *
 * FIX: the previous implementation treated the boolean result of the initData
 * validator as a user object and minted a forgeable base64 token with `Buffer`.
 * This version:
 *   1. validates initData with the Web Crypto validator (freshness enforced),
 *   2. upserts the Telegram user in D1,
 *   3. issues an HMAC-SHA256 signed session token via lib/sessionToken,
 *      signed with env.JWT_SECRET.
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import {
  resolveMaxAgeSeconds,
  validateTelegramInitData,
  type TelegramUser,
} from '../lib/telegramAuth'
import { issueSessionToken } from '../lib/sessionToken'

interface UserRow {
  id: number
  telegram_id: number
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_creator: number
  is_admin: number
  verified: number
  balance_stars: number
  balance_rtv: number
}

function displayNameOf(user: TelegramUser): string | null {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name.length > 0 ? name : null
}

function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isCreator: Boolean(row.is_creator),
    isAdmin: Boolean(row.is_admin),
    verified: Boolean(row.verified),
    balanceStars: row.balance_stars,
    balanceRtv: row.balance_rtv,
  }
}

async function extractInitData(c: {
  req: {
    header: (name: string) => string | undefined
    query: (name: string) => string | undefined
    json: () => Promise<unknown>
  }
}): Promise<string | undefined> {
  const contentType = c.req.header('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as { initData?: unknown } | null
      if (body && typeof body.initData === 'string' && body.initData.length > 0) {
        return body.initData
      }
    } catch {
      // Fall through to header/query extraction.
    }
  }
  return c.req.header('X-Telegram-Init-Data') ?? c.req.query('initData')
}

const app = new Hono<{ Bindings: Env }>()

app.post('/telegram', async (c) => {
  if (!c.env.JWT_SECRET) {
    return c.json({ success: false, error: 'Server misconfigured: JWT_SECRET is not set' }, 500)
  }
  if (!c.env.TELEGRAM_BOT_TOKEN) {
    return c.json(
      { success: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' },
      500,
    )
  }

  const initData = await extractInitData(c)
  if (!initData) {
    return c.json({ success: false, error: 'initData is required' }, 400)
  }

  // 1. Validate initData (HMAC-SHA256 + auth_date freshness).
  const maxAgeSeconds = resolveMaxAgeSeconds(c.env.TELEGRAM_INITDATA_MAX_AGE)
  const result = await validateTelegramInitData(initData, c.env.TELEGRAM_BOT_TOKEN, {
    maxAgeSeconds,
  })

  if (!result.valid) {
    if (result.error === 'initData expired') {
      return c.json({ success: false, error: 'initData expired' }, 401)
    }
    return c.json({ success: false, error: result.error ?? 'Invalid initData' }, 401)
  }

  const tgUser = result.user
  if (!tgUser || typeof tgUser.id !== 'number') {
    return c.json({ success: false, error: 'initData missing user payload' }, 401)
  }

  // 2. Upsert the user in D1.
  const db = getDb(c.env.D1)
  const username = tgUser.username ?? null
  const displayName = displayNameOf(tgUser)
  const avatarUrl = typeof tgUser.photo_url === 'string' ? tgUser.photo_url : null

  let user = await db.queryOne<UserRow>(
    'SELECT * FROM users WHERE telegram_id = ?',
    [tgUser.id],
  )

  if (user) {
    await db.exec(
      "UPDATE users SET username = ?, display_name = ?, avatar_url = ?, updated_at = datetime('now') WHERE telegram_id = ?",
      [username, displayName, avatarUrl, tgUser.id],
    )
    user = { ...user, username, display_name: displayName, avatar_url: avatarUrl }
  } else {
    // users.id is INTEGER PRIMARY KEY (autoincrement) — do NOT supply it.
    const insert = await db.exec(
      'INSERT INTO users (telegram_id, username, display_name, avatar_url, is_creator, is_admin, verified, balance_stars, balance_rtv) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0)',
      [tgUser.id, username, displayName, avatarUrl],
    )
    const newId = insert.meta?.last_row_id
    user = newId
      ? ((await db.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [newId])) ?? null)
      : null
    if (!user) {
      return c.json({ success: false, error: 'Failed to create user' }, 500)
    }
  }

  // 3. Issue a signed session token.
  const session = await issueSessionToken(String(user.id), tgUser.id, c.env.JWT_SECRET)

  return c.json({
    success: true,
    user: toPublicUser(user),
    token: session.token,
    expiresAt: new Date(session.expiresAt).toISOString(),
  })
})

export { app as authRoutes }
