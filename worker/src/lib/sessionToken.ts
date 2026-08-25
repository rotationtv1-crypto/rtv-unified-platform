/**
 * HMAC-SHA256 signed session tokens for Cloudflare Workers.
 *
 * Token format:
 *   rtv1.<base64url(json payload)>.<base64url(hmac-sha256 signature)>
 *
 * Payload: { uid: string, tg: number, iat: number, exp: number }
 *   uid — internal user id
 *   tg  — Telegram user id
 *   iat — issued-at, epoch seconds
 *   exp — expiry, epoch seconds
 *
 * Signature input is the ASCII string `rtv1.<payload>` (everything before the
 * final dot). Verification recomputes the HMAC and compares in constant time.
 *
 * Runtime constraint: Web Crypto API ONLY — no `node:crypto`, no `Buffer`.
 * base64url is hand-rolled over Uint8Array.
 */

export interface SessionTokenPayload {
  uid: string
  tg: number
  iat: number
  exp: number
}

export interface IssuedSessionToken {
  token: string
  /** Expiry in epoch milliseconds (suitable for `new Date(expiresAt)`). */
  expiresAt: number
}

export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const TOKEN_VERSION = 'rtv1'
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** base64url-encode bytes (no padding, URL-safe alphabet). */
export function base64urlEncode(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const hasB1 = i + 1 < bytes.length
    const hasB2 = i + 2 < bytes.length
    const b1 = hasB1 ? bytes[i + 1] : 0
    const b2 = hasB2 ? bytes[i + 2] : 0
    out += B64_ALPHABET[b0 >> 2]
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)]
    if (hasB1) out += B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)]
    if (hasB2) out += B64_ALPHABET[b2 & 0x3f]
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_')
}

/** base64url-decode a string; returns null on invalid characters/length. */
export function base64urlDecode(input: string): Uint8Array | null {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  if (b64.length % 4 === 1) return null
  if (b64.length === 0) return new Uint8Array(0)
  const values: number[] = new Array(b64.length)
  for (let i = 0; i < b64.length; i++) {
    const v = B64_ALPHABET.indexOf(b64[i])
    if (v < 0) return null
    values[i] = v
  }
  const bytes: number[] = []
  for (let i = 0; i < values.length; i += 4) {
    const a = values[i]
    const b = values[i + 1]
    const c = values[i + 2]
    const d = values[i + 3]
    if (b === undefined) return null
    const n = (a << 18) | (b << 12) | ((c ?? 0) << 6) | (d ?? 0)
    bytes.push((n >> 16) & 0xff)
    if (c !== undefined) bytes.push((n >> 8) & 0xff)
    if (d !== undefined) bytes.push(n & 0xff)
  }
  return new Uint8Array(bytes)
}

/** Constant-time comparison of two byte arrays. */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  const maxLen = Math.max(a.length, b.length, 1)
  let diff = a.length ^ b.length
  for (let i = 0; i < maxLen; i++) {
    const x = a.length > 0 ? a[i % a.length] : 0
    const y = b.length > 0 ? b[i % b.length] : 0
    diff |= x ^ y
  }
  return diff === 0
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data))
  return new Uint8Array(signature)
}

function isValidPayload(value: unknown): value is SessionTokenPayload {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    typeof p.uid === 'string' &&
    typeof p.tg === 'number' &&
    typeof p.iat === 'number' &&
    typeof p.exp === 'number'
  )
}

/**
 * Issue a signed session token.
 *
 * @param userId     Internal user id.
 * @param telegramId Telegram user id.
 * @param secret     Signing secret (env.JWT_SECRET).
 * @param ttlSeconds Lifetime in seconds (default 7 days).
 */
export async function issueSessionToken(
  userId: string,
  telegramId: number,
  secret: string,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<IssuedSessionToken> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionTokenPayload = {
    uid: userId,
    tg: telegramId,
    iat: now,
    exp: now + ttlSeconds,
  }
  const payloadB64 = base64urlEncode(textEncoder.encode(JSON.stringify(payload)))
  const signingInput = `${TOKEN_VERSION}.${payloadB64}`
  const signature = await hmacSha256(secret, signingInput)
  return {
    token: `${signingInput}.${base64urlEncode(signature)}`,
    expiresAt: payload.exp * 1000,
  }
}

/**
 * Verify a session token. Returns the decoded payload when the signature is
 * valid and the token is not expired; otherwise null.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionTokenPayload | null> {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [version, payloadB64, signatureB64] = parts
  if (version !== TOKEN_VERSION || !payloadB64 || !signatureB64) return null

  const signatureBytes = base64urlDecode(signatureB64)
  if (!signatureBytes) return null

  const signingInput = `${version}.${payloadB64}`
  const expected = await hmacSha256(secret, signingInput)
  if (!timingSafeEqualBytes(signatureBytes, expected)) return null

  const payloadBytes = base64urlDecode(payloadB64)
  if (!payloadBytes) return null

  let payload: unknown
  try {
    payload = JSON.parse(textDecoder.decode(payloadBytes))
  } catch {
    return null
  }
  if (!isValidPayload(payload)) return null

  if (payload.exp <= Math.floor(Date.now() / 1000)) return null

  return payload
}
