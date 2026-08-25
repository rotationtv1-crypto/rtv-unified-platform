import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { corsHeadersFor, internalError } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Deliberately generic — do not reveal whether the email exists.
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = signInData.user
    const session = signInData.session

    // Get profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Store session
    await supabaseAdmin.from('auth_sessions').insert({
      user_id: user.id,
      token_hash: session.access_token.slice(-32),
      refresh_token_hash: session.refresh_token?.slice(-32),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return new Response(
      JSON.stringify({
        token: session.access_token,
        refreshToken: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          displayName: profile?.display_name || user.email?.split('@')[0] || 'User',
          avatarUrl: profile?.avatar_url,
          subscriptionTier: profile?.subscription_tier || 'free',
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: internalError(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
