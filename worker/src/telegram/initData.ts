import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

export async function validateInitData(initData: string, botToken: string): Promise<{
  valid: boolean
  user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; language_code?: string }
  auth_date?: number
  hash?: string
}> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { valid: false }

  params.delete('hash')
  const pairs: string[] = []
  params.sort()
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`)
  }
  const dataCheckString = pairs.join('\n')

  const encoder = new TextEncoder()

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const secretKey = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode('WebAppData'))

  const secretKeyForHash = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const checkHashBuf = await crypto.subtle.sign('HMAC', secretKeyForHash, encoder.encode(dataCheckString))
  const checkHash = Array.from(new Uint8Array(checkHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (checkHash !== hash) return { valid: false }

  const userStr = params.get('user')
  if (!userStr) return { valid: false }

  try {
    const user = JSON.parse(userStr)
    return { valid: true, user, auth_date: Number(params.get('auth_date')), hash }
  } catch {
    return { valid: false }
  }
}

export const telegramAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const initData = c.req.header('X-Telegram-Init-Data') || c.req.query('initData')
  const botId = c.req.header('X-Bot-Id') || 'default'

  if (!initData) {
    return c.json({ error: 'Missing Telegram initData' }, 401)
  }

  let botToken: string | null = null
  if (botId === 'default' || botId === 'rtv') {
    botToken = c.env.TELEGRAM_BOT_TOKEN
  } else {
    botToken = await c.env.KV_CACHE.get(`bot_token:${botId}`)
  }

  if (!botToken) {
    return c.json({ error: 'Bot not found' }, 404)
  }

  const result = await validateInitData(initData, botToken)
  if (!result.valid) {
    return c.json({ error: 'Invalid initData signature' }, 403)
  }

  c.set('telegramUser', result.user!)
  c.set('botId', botId)
  await next()
})
