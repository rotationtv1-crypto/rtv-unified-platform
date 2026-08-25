/**
 * Authentication & authorization middleware for the rtv-api worker.
 *
 * Two guards:
 *
 *   requireAuth  — verifies the `Authorization: Bearer rtv1.<...>` session
 *                  token issued by POST /api/auth/telegram (HMAC-SHA256,
 *                  see lib/sessionToken.ts). On success it sets
 *                  `c.set('userId', payload.uid)` and
 *                  `c.set('telegramId', payload.tg)`.
 *                  FAIL-CLOSED: 500 when JWT_SECRET is not configured,
 *                  401 when the token is missing/invalid/expired.
 *
 *   requireAdmin — constant-time comparison of the `X-Admin-Secret` header
 *                  against env.ADMIN_SECRET.
 *                  FAIL-CLOSED: 503 when ADMIN_SECRET is not configured
 *                  (previously `undefined !== undefined` let every request
 *                  through when the secret was unset).
 *
 * SECURITY: never accept identity from a bare `X-User-Id` header — any client
 * can set it. Identity must always come from a verified session token.
 */

import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { verifySessionToken } from './sessionToken'

const textEncoder = new TextEncoder()

/** Constant-time string comparison (length differences mixed into result). */
export function timingSafeEqualString(a: string, b: string): boolean {
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

export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const secret = c.env.JWT_SECRET
  if (!secret) {
    return c.json({ error: 'Server misconfigured: JWT_SECRET is not set' }, 500)
  }

  const header = c.req.header('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) {
    return c.json({ error: 'Unauthorized: Bearer session token required' }, 401)
  }

  const payload = await verifySessionToken(match[1], secret)
  if (!payload) {
    return c.json({ error: 'Unauthorized: invalid or expired session token' }, 401)
  }

  c.set('userId', payload.uid)
  c.set('telegramId', payload.tg)
  await next()
})

export const requireAdmin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const configured = c.env.ADMIN_SECRET
  if (!configured) {
    // Fail closed: with no secret configured there is nothing safe to compare
    // against — refusing all admin traffic is the only correct behaviour.
    return c.json({ error: 'Server misconfigured: ADMIN_SECRET is not set' }, 503)
  }

  const provided = c.req.header('X-Admin-Secret') ?? ''
  if (!provided || !timingSafeEqualString(provided, configured)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})
