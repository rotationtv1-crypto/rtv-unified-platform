import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { sha256Hex, verifyTributeSignature } from '../_shared/tributeSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, trbt-signature',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  const url = new URL(req.url)
  const source = url.searchParams.get('source') || 'tribute'

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    if (source === 'telegram') {
      const payload = await req.json()

      await supabaseAdmin.from('webhook_events').insert({
        source: 'telegram',
        event_type: payload.update_type || 'unknown',
        payload,
        processed: false,
      })

      if (payload.pre_checkout_query) {
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

        return jsonResponse({ ok: true })
      }

      if (payload.message?.successful_payment) {
        const payment = payload.message.successful_payment

        const { data: transaction } = await supabaseAdmin.from('transactions').insert({
          provider: 'telegram_stars',
          provider_transaction_id: payment.telegram_payment_charge_id,
          amount: payment.total_amount / 100,
          currency: payment.currency,
          status: 'completed',
          item_type: payment.invoice_payload?.includes('subscription') ? 'subscription' : 'donation',
          metadata: payment,
          completed_at: new Date().toISOString(),
        }).select().single()

        return jsonResponse({ ok: true, transaction })
      }

      return jsonResponse({ ok: true, message: 'Event logged' })
    }

    if (source === 'tribute') {
      // IMPORTANT: verify the exact raw body before JSON parsing or mutation.
      const rawBody = await req.text()
      const signature = req.headers.get('trbt-signature')
      const apiKey = Deno.env.get('TRIBUTE_API_KEY')

      if (!apiKey) {
        console.error('TRIBUTE_API_KEY is not configured')
        return jsonResponse({ error: 'webhook_not_configured' }, 503)
      }

      const validSignature = await verifyTributeSignature(rawBody, signature, apiKey)
      if (!validSignature) {
        return jsonResponse({ error: 'invalid_webhook_signature' }, 401)
      }

      const eventHash = await sha256Hex(rawBody)
      const payload = JSON.parse(rawBody)
      const eventType = payload.name || payload.event || 'unknown'

      // Tribute retries failed deliveries. The raw-body hash gives us a stable
      // idempotency key even when a provider event does not expose an event ID.
      const { error: eventInsertError } = await supabaseAdmin.from('webhook_events').insert({
        source: 'tribute',
        event_type: eventType,
        payload,
        event_hash: eventHash,
        processed: false,
      })

      if (eventInsertError?.code === '23505') {
        return jsonResponse({ ok: true, duplicate: true })
      }

      if (eventInsertError) {
        throw eventInsertError
      }

      // Keep compatibility with the existing internal event contract while also
      // accepting current Tribute event names such as new_donation.
      const tributeData = payload.data ?? payload.payload ?? payload
      const completedEvents = new Set([
        'payment.completed',
        'new_donation',
        'recurrent_donation',
        'new_subscription',
        'renewed_subscription',
        'new_digital_product',
      ])

      if (completedEvents.has(eventType)) {
        const providerTransactionId = String(
          tributeData.id ??
          tributeData.uuid ??
          tributeData.purchase_id ??
          tributeData.subscription_id ??
          eventHash,
        )

        const { data: transaction, error: transactionError } = await supabaseAdmin.from('transactions').insert({
          provider: 'tribute',
          provider_transaction_id: providerTransactionId,
          amount: Number(tributeData.amount ?? tributeData.total_amount ?? 0),
          currency: tributeData.currency ?? 'XTR',
          status: 'completed',
          item_type: eventType.includes('subscription') ? 'subscription' : 'tip',
          metadata: tributeData,
          completed_at: new Date().toISOString(),
        }).select().single()

        // A provider retry may arrive concurrently. The unique provider
        // transaction index makes the transaction write atomic and prevents a
        // second creator-earnings increment.
        if (transactionError?.code === '23505') {
          return jsonResponse({ ok: true, duplicate: true })
        }
        if (transactionError) throw transactionError

        if (tributeData.recipient_id) {
          await supabaseAdmin.from('tributes').insert({
            sender_id: tributeData.sender_id,
            recipient_id: tributeData.recipient_id,
            amount: Number(tributeData.amount ?? tributeData.total_amount ?? 0),
            currency: tributeData.currency ?? 'XTR',
            message: tributeData.message,
            transaction_id: transaction?.id,
            status: 'completed',
          })

          await supabaseAdmin.rpc('increment_creator_earnings', {
            creator_id: tributeData.recipient_id,
            amount: Number(tributeData.amount ?? tributeData.total_amount ?? 0),
          })
        }

        await supabaseAdmin.from('webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('source', 'tribute')
          .eq('event_hash', eventHash)

        return jsonResponse({ ok: true, transaction })
      }

      await supabaseAdmin.from('webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('source', 'tribute')
        .eq('event_hash', eventHash)

      return jsonResponse({ ok: true, message: 'Event logged' })
    }

    const payload = await req.json()
    await supabaseAdmin.from('webhook_events').insert({
      source,
      event_type: payload.event || 'unknown',
      payload,
      processed: false,
    })

    return jsonResponse({ ok: true, message: 'Webhook received' })
  } catch (err) {
    console.error('Webhook processing failed', err)
    return jsonResponse({ error: 'webhook_processing_failed' }, 500)
  }
})
