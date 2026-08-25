import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { corsHeadersFor, internalError } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, display_name } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof password !== 'string' || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || email.split('@')[0] }
    })

    if (authError || !authData?.user) {
      console.error('createUser failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Registration failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sign in to get tokens
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('post-registration sign-in failed:', signInError)
      return new Response(
        JSON.stringify({ error: 'Registration failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = signInData.user
    const session = signInData.session

    // Store session in database
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
          displayName: display_name || email.split('@')[0],
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
