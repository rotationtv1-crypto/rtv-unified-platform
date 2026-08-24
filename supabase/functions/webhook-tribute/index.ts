import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const source = url.searchParams.get('source') || 'tribute'

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle Telegram Stars webhook
    if (source === 'telegram') {
      const payload = await req.json()

      // Log the webhook event
      await supabaseAdmin.from('webhook_events').insert({
        source: 'telegram',
        event_type: payload.update_type || 'unknown',
        payload,
        processed: false,
      })

      // Handle pre_checkout_query for Telegram Stars
      if (payload.pre_checkout_query) {
        // Answer the pre-checkout query (required for Telegram Payments)
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pre_checkout_query_id: payload.pre_checkout_query.id,
              ok: true,
            }),
          })
        }

        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Handle successful payment
      if (payload.message?.successful_payment) {
        const payment = payload.message.successful_payment

        // Create transaction record
        const { data: transaction } = await supabaseAdmin.from('transactions').insert({
          provider: 'telegram_stars',
          provider_transaction_id: payment.telegram_payment_charge_id,
          amount: payment.total_amount / 100, // Stars are in smallest units
          currency: payment.currency,
          status: 'completed',
          item_type: payment.invoice_payload?.includes('subscription') ? 'subscription' : 'donation',
          metadata: payment,
          completed_at: new Date().toISOString(),
        }).select().single()

        return new Response(
          JSON.stringify({ ok: true, transaction }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, message: 'Event logged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle Tribute Pay webhook
    if (source === 'tribute') {
      const payload = await req.json()

      // Log the webhook event
      await supabaseAdmin.from('webhook_events').insert({
        source: 'tribute',
        event_type: payload.event || 'unknown',
        payload,
        processed: false,
      })

      // Process tribute payment
      if (payload.event === 'payment.completed') {
        const tributeData = payload.data

        // Create transaction
        const { data: transaction } = await supabaseAdmin.from('transactions').insert({
          provider: 'tribute',
          provider_transaction_id: tributeData.id,
          amount: tributeData.amount,
          currency: tributeData.currency,
          status: 'completed',
          item_type: 'tip',
          metadata: tributeData,
          completed_at: new Date().toISOString(),
        }).select().single()

        // Create tribute record if recipient exists
        if (tributeData.recipient_id) {
          await supabaseAdmin.from('tributes').insert({
            sender_id: tributeData.sender_id,
            recipient_id: tributeData.recipient_id,
            amount: tributeData.amount,
            currency: tributeData.currency,
            message: tributeData.message,
            transaction_id: transaction?.id,
            status: 'completed',
          })

          // Update creator earnings
          await supabaseAdmin.rpc('increment_creator_earnings', {
            creator_id: tributeData.recipient_id,
            amount: tributeData.amount,
          })
        }

        return new Response(
          JSON.stringify({ ok: true, transaction }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, message: 'Event logged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generic webhook handler
    const payload = await req.json()
    await supabaseAdmin.from('webhook_events').insert({
      source,
      event_type: payload.event || 'unknown',
      payload,
      processed: false,
    })

    return new Response(
      JSON.stringify({ ok: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
