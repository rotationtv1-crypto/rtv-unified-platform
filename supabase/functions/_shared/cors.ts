/**
 * Shared CORS + error helpers for Supabase Edge Functions.
 *
 * SECURITY: all functions previously shipped `Access-Control-Allow-Origin: *`.
 * Origin is now allowlisted via the ALLOWED_ORIGINS env var (comma-separated),
 * defaulting to the production site. The request origin is reflected only when
 * allowlisted; server-to-server calls without an Origin header get the default.
 *
 * 500 responses must never echo err.message to the client — internal error
 * text leaks schema names, env misconfiguration, and upstream API details.
 * The real error is logged (visible in Supabase function logs) and the client
 * gets a generic message.
 */

const DEFAULT_ORIGINS = ['https://rotationtv.network']

export function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS')
  if (!raw) return DEFAULT_ORIGINS
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean)
  return list.length > 0 ? list : DEFAULT_ORIGINS
}

export function corsHeadersFor(req: Request, methods?: string): Record<string, string> {
  const origins = allowedOrigins()
  const requestOrigin = req.headers.get('Origin')
  const origin = requestOrigin && origins.includes(requestOrigin)
    ? requestOrigin
    : origins[0]

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token, trbt-signature',
    'Vary': 'Origin',
  }
  if (methods) headers['Access-Control-Allow-Methods'] = methods
  return headers
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status: number,
  methods?: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req, methods), 'Content-Type': 'application/json' },
  })
}

/** Log the real error, return a client-safe message. */
export function internalError(err: unknown): string {
  console.error('Edge function error:', err)
  return 'Internal error'
}

/** Constant-time string comparison for webhook secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const ba = encoder.encode(a)
  const bb = encoder.encode(b)
  const maxLen = Math.max(ba.length, bb.length, 1)
  let diff = ba.length ^ bb.length
  for (let i = 0; i < maxLen; i++) {
    const x = ba.length > 0 ? ba[i % ba.length] : 0
    const y = bb.length > 0 ? bb[i % bb.length] : 0
    diff |= x ^ y
  }
  return diff === 0
}
