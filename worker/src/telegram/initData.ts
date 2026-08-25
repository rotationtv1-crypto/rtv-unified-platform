/**
 * Telegram Mini App initData validation for Cloudflare Workers.
 *
 * Implements the canonical Telegram Web App validation algorithm
 * (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
 *
 *   secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   check_hash = HMAC_SHA256(key = secret_key,  data = data_check_string)
 *
 * where data_check_string is every initData key=value pair EXCEPT `hash`,
 * keys sorted alphabetically, joined with "\n".
 *
 * Runtime constraint: Web Crypto API ONLY — no `node:crypto`, no `Buffer`.
 */

import type { Context, Next } from 'hono'
import type { Env } from '../types'

/** Shape of the `user` object embedded in Telegram initData. */
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
  [key: string]: unknown
}

export interface ValidateInitDataOptions {
  /**
   * Maximum accepted age of `auth_date`, in seconds.
   * Default 86400 (24h). Pass 0 to disable the freshness check.
   */
  maxAgeSeconds?: number
}

export interface InitDataValidationResult {
  valid: boolean
  user?: TelegramUser
  authDate?: number
  queryId?: string
  hash?: string
  error?: string
}

export const DEFAULT_INITDATA_MAX_AGE_SECONDS = 86400

const textEncoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time string comparison. Lengths are mixed into the accumulator so
 * mismatched-length inputs also fail without an early return.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const ba = textEncoder.encode(a)
  const bb = textEncoder.encode(b)
  const maxLen = Math.max(ba.length, bb.length, 1)
  let diff = ba.length ^ bb.length
  for (let i = 0; i < maxLen; i++) {
    const x = ba.length > 0 ? ba[i % ba.length] : 0
    const y = bb.length > 0 ? bb[i % bb.length] : 0
    diff |= x ^ y
  }
  return diff === 0
}

/** Resolve a max-age env string (seconds) to a number; falls back to 86400. */
export function resolveMaxAgeSeconds(
  value: string | undefined,
  fallback: number = DEFAULT_INITDATA_MAX_AGE_SECONDS,
): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

/**
 * Validate Telegram Mini App initData against a bot token.
 *
 * Returns `{ valid: false, error }` on any failure. `error === 'initData expired'`
 * specifically signals an `auth_date` older than `maxAgeSeconds`.
 */
export async function validateTelegramInitData(
  initData: string,
  botToken: string,
  options: ValidateInitDataOptions = {},
): Promise<InitDataValidationResult> {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_INITDATA_MAX_AGE_SECONDS

  if (!initData || typeof initData !== 'string') {
    return { valid: false, error: 'missing initData' }
  }
  if (!botToken) {
    return { valid: false, error: 'missing bot token' }
  }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { valid: false, error: 'malformed initData' }
  }

  const hash = params.get('hash')
  if (!hash) {
    return { valid: false, error: 'missing hash' }
  }

  // Build data_check_string: all pairs except `hash`, sorted by key, joined with \n.
  // URLSearchParams already URL-decodes keys and values.
  const pairs: string[] = []
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`)
  })
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  // secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
  const webAppDataKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const secretKey = await crypto.subtle.sign('HMAC', webAppDataKey, textEncoder.encode(botToken))

  // check_hash = HMAC_SHA256(key = secret_key, data = data_check_string), hex lowercase
  const checkKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', checkKey, textEncoder.encode(dataCheckString))
  const computedHash = toHex(signature)

  if (!timingSafeEqual(computedHash, hash.toLowerCase())) {
    return { valid: false, hash, error: 'invalid hash' }
  }

  // auth_date must exist and be numeric.
  const authDateRaw = params.get('auth_date')
  const authDate = authDateRaw !== null ? Number(authDateRaw) : NaN
  if (authDateRaw === null || !Number.isFinite(authDate)) {
    return { valid: false, hash, error: 'missing or invalid auth_date' }
  }

  // Freshness check (maxAgeSeconds === 0 disables it).
  if (maxAgeSeconds > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate
    if (ageSeconds > maxAgeSeconds) {
      return { valid: false, hash, authDate, error: 'initData expired' }
    }
  }

  const user = parseTelegramUser(initData)
  const queryId = params.get('query_id') ?? undefined

  return { valid: true, user, authDate, queryId, hash }
}

/**
 * Parse the `user` object out of raw initData. Returns undefined when the
 * field is absent, unparseable, or lacks a numeric `id`.
 */
export function parseTelegramUser(initData: string): TelegramUser | undefined {
  try {
    const raw = new URLSearchParams(initData).get('user')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed.id !== 'number') return undefined
    return parsed as TelegramUser
  } catch {
    return undefined
  }
}

/** Extract initData from a JSON request body, if present. Hono caches the parsed body. */
async function readBodyInitData(c: Context): Promise<string | undefined> {
  const contentType = c.req.header('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined
  try {
    const body = (await c.req.json()) as Record<string, unknown> | null
    if (body && typeof body.initData === 'string') return body.initData
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Legacy-compatible alias kept for `routes/telegram.ts`, which calls
 * `validateInitData(initData, token)` and reads `.valid` / `.user`.
 * New code should call `validateTelegramInitData` directly.
 */
export async function validateInitData(
  initData: string,
  botToken: string,
): Promise<InitDataValidationResult> {
  return validateTelegramInitData(initData, botToken)
}

/**
 * Hono middleware that enforces valid Telegram initData on a route.
 *
 * Looks for initData in (first match wins):
 *   1. `X-Telegram-Init-Data` header
 *   2. `initData` query parameter
 *   3. `initData` field of a JSON body
 *
 * Bot token resolution:
 *   - default bot (`X-Telegram-Bot-Id` / `X-Bot-Id` / `botId` absent or "default") -> env.TELEGRAM_BOT_TOKEN
 *   - any other botId -> KV_CACHE key `bot_token:<botId>`
 *
 * On success sets context vars `telegramUser`, `botId` and `botToken`, then
 * calls next(). On failure responds 401 (`{ success: false, error }`), using
 * `initData expired` for stale auth_date.
 *
 * Freshness window comes from env.TELEGRAM_INITDATA_MAX_AGE (string seconds,
 * default 86400; "0" disables the check).
 */
export async function telegramAuthMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  const initData =
    c.req.header('X-Telegram-Init-Data') ??
    c.req.query('initData') ??
    (await readBodyInitData(c))

  if (!initData) {
    return c.json({ success: false, error: 'Missing Telegram initData' }, 401)
  }

  const botId =
    c.req.header('X-Telegram-Bot-Id') ?? c.req.header('X-Bot-Id') ?? c.req.query('botId') ?? 'default'

  let botToken: string | undefined
  if (botId === 'default') {
    botToken = c.env.TELEGRAM_BOT_TOKEN
  } else {
    botToken = (await c.env.KV_CACHE.get(`bot_token:${botId}`)) ?? undefined
  }

  if (!botToken) {
    return c.json({ success: false, error: 'Unknown bot' }, 401)
  }

  const maxAgeSeconds = resolveMaxAgeSeconds(c.env.TELEGRAM_INITDATA_MAX_AGE)
  const result = await validateTelegramInitData(initData, botToken, { maxAgeSeconds })

  if (!result.valid || !result.user) {
    const error =
      result.valid && !result.user
        ? 'initData missing user payload'
        : (result.error ?? 'Invalid Telegram initData')
    return c.json({ success: false, error }, 401)
  }

  c.set('telegramUser', result.user)
  c.set('botId', botId)
  c.set('botToken', botToken)

  await next()
}
