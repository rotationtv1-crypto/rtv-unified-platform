import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HMAC-SHA256 validation for Telegram Mini App initData
async function validateTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false

  params.delete('hash')

  // Sort keys alphabetically
  const keys = Array.from(params.keys()).sort()
  const dataCheckString = keys.map((k) => `${k}=${params.get(k)}`).join('\n')

  const encoder = new TextEncoder()

  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secretKeyData = encoder.encode(botToken)
  const webAppData = encoder.encode('WebAppData')

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const secretKey = await crypto.subtle.sign('HMAC', cryptoKey, webAppData)

  // Validate hash
  const validationKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const checkSignature = await crypto.subtle.sign('HMAC', validationKey, encoder.encode(dataCheckString))
  const checkHash = Array.from(new Uint8Array(checkSignature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return checkHash === hash
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData, initDataUnsafe } = await req.json()

    if (!initData) {
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
    const isValid = botToken ? await validateTelegramInitData(initData, botToken) : true // Skip validation if no bot token configured

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram initData signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = initDataUnsafe?.user
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No user data in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      // Create auth user and profile
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

    return new Response(
      JSON.stringify({
        valid: true,
        user: {
          id: telegramUser.profile_id,
          telegramId: user.id,
          firstName: user.first_name,
          username: user.username,
          photoUrl: user.photo_url,
        },
        token: sessionData?.properties?.hashed_token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
