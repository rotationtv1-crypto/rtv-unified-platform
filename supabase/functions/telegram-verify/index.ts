import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Telegram Mini App initData validation (canonical algorithm):
//   secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
//   check_hash = HMAC_SHA256(key = secret_key,  data = data_check_string)
// data_check_string = all initData key=value pairs EXCEPT `hash`,
// keys sorted alphabetically, joined with "\n".
//
// FIX: the previous implementation inverted key/data (HMAC(key=botToken,
// data="WebAppData")), rejecting all genuine initData — and worse, SKIPPED
// validation entirely when TELEGRAM_BOT_TOKEN was unset. Validation now
// fails closed, and the user is parsed from the *validated* initData rather
// than trusting the client-supplied `initDataUnsafe` payload.
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()
const DEFAULT_MAX_AGE_SECONDS = 86400 // 24h; set TELEGRAM_INITDATA_MAX_AGE=0 to disable

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface ValidationResult {
  valid: boolean
  user?: TelegramUser
  authDate?: number
  error?: string
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison (lengths mixed into the accumulator). */
function timingSafeEqual(a: string, b: string): boolean {
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

async function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): Promise<ValidationResult> {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { valid: false, error: 'malformed initData' }
  }

  const hash = params.get('hash')
  if (!hash) return { valid: false, error: 'missing hash' }

  const pairs: string[] = []
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`)
  })
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  // secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
  const webAppDataKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const secretKey = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken))

  // check_hash = HMAC_SHA256(key = secret_key, data = data_check_string)
  const checkKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const checkHash = toHex(await crypto.subtle.sign('HMAC', checkKey, encoder.encode(dataCheckString)))

  if (!timingSafeEqual(checkHash, hash.toLowerCase())) {
    return { valid: false, error: 'invalid hash' }
  }

  const authDateRaw = params.get('auth_date')
  const authDate = authDateRaw !== null ? Number(authDateRaw) : NaN
  if (authDateRaw === null || !Number.isFinite(authDate)) {
    return { valid: false, error: 'missing or invalid auth_date' }
  }
  if (maxAgeSeconds > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate
    if (ageSeconds > maxAgeSeconds) {
      return { valid: false, error: 'initData expired' }
    }
  }

  const userRaw = params.get('user')
  if (!userRaw) return { valid: false, error: 'initData missing user payload' }
  try {
    const user = JSON.parse(userRaw) as TelegramUser
    if (typeof user?.id !== 'number') return { valid: false, error: 'initData missing user payload' }
    return { valid: true, user, authDate }
  } catch {
    return { valid: false, error: 'initData missing user payload' }
  }
}

function resolveMaxAgeSeconds(): number {
  const raw = Deno.env.get('TELEGRAM_INITDATA_MAX_AGE')
  if (!raw) return DEFAULT_MAX_AGE_SECONDS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_AGE_SECONDS
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()

    if (!initData || typeof initData !== 'string') {
      return json({ error: 'initData is required' }, 400)
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    // FAIL CLOSED: never skip validation when the token is not configured.
    if (!botToken) {
      return json({ error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' }, 500)
    }

    const result = await validateTelegramInitData(initData, botToken, resolveMaxAgeSeconds())
    if (!result.valid || !result.user) {
      return json({ error: result.error ?? 'Invalid Telegram initData signature' }, 403)
    }

    // User identity comes from the VALIDATED initData — never from
    // client-supplied initDataUnsafe.
    const user = result.user

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upsert telegram user
    const { data: telegramUser, error: tgError } = await supabaseAdmin
      .from('telegram_users')
      .upsert({
        telegram_id: user.id,
        telegram_username: user.username,
        telegram_first_name: user.first_name,
        telegram_last_name: user.last_name,
        telegram_photo_url: user.photo_url,
        init_data_raw: initData,
        init_data_validated: true,
        last_interaction_at: new Date().toISOString(),
      }, { onConflict: 'telegram_id' })
      .select()
      .single()

    if (tgError) throw tgError

    // Create or link profile
    if (!telegramUser.profile_id) {
      const email = `${user.id}@telegram.rotationtv.network`
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          display_name: user.first_name || user.username || `User ${user.id}`,
          telegram_id: user.id,
        }
      })

      if (!authError && authUser?.user) {
        await supabaseAdmin
          .from('telegram_users')
          .update({ profile_id: authUser.user.id })
          .eq('telegram_id', user.id)

        telegramUser.profile_id = authUser.user.id
      }
    }

    // Generate session token
    const { data: sessionData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${user.id}@telegram.rotationtv.network`,
    })

    return json({
      valid: true,
      user: {
        id: telegramUser.profile_id,
        telegramId: user.id,
        firstName: user.first_name,
        username: user.username,
        photoUrl: user.photo_url,
      },
      token: sessionData?.properties?.hashed_token,
    }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
