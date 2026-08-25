/**
 * Payment webhook receiver (Telegram Stars + Tribute).
 *
 * SECURITY FIX: the previous version accepted ANY POST as a genuine payment —
 * no Telegram webhook-secret check, no Tribute signature verification — so
 * anyone could forge `successful_payment` / `payment.completed` events and
 * credit creator earnings. Both providers are now verified and FAIL CLOSED
 * when their verification secret is not configured:
 *
 *   Telegram: setWebhook(secret_token=...) delivers the secret back in the
 *             X-Telegram-Bot-Api-Secret-Token header. Compared (constant time)
 *             against the TELEGRAM_WEBHOOK_SECRET env var.
 *
 *   Tribute:  signs the raw request body with HMAC-SHA256 using your API key
 *             and sends it in the `trbt-signature` header (hex). Verified
 *             against TRIBUTE_WEBHOOK_SECRET (or TRIBUTE_API_KEY).
 *
 * Also fixed: Telegram Stars (XTR) have no minor units — total_amount is
 * already whole Stars; the old `/ 100` corrupted every Stars amount.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import {
  corsHeadersFor,
  internalError,
  jsonResponse,
  timingSafeEqual,
} from '../_shared/cors.ts'

const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405)
  }

  const url = new URL(req.url)
  const source = url.searchParams.get('source') || 'tribute'
  // Raw body is needed for signature verification — read once, parse after.
  const rawBody = await req.text()

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ===== Telegram Stars webhook =====
    if (source === 'telegram') {
      const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
      if (!expectedSecret) {
        // Fail closed — unverifiable payment events must not be processed.
        console.error('TELEGRAM_WEBHOOK_SECRET is not set')
        return jsonResponse(req, { error: 'Webhook verification not configured' }, 503)
      }
      const providedSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
      if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
        return jsonResponse(req, { error: 'Forbidden' }, 403)
      }

      const payload = JSON.parse(rawBody)

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
        return jsonResponse(req, { ok: true }, 200)
      }

      if (payload.message?.successful_payment) {
        const payment = payload.message.successful_payment
        // XTR (Telegram Stars) has no minor units; fiat currencies do.
        const amount = payment.currency === 'XTR'
          ? payment.total_amount
          : payment.total_amount / 100

        const { data: transaction } = await supabaseAdmin.from('transactions').insert({
          provider: 'telegram_stars',
          provider_transaction_id: payment.telegram_payment_charge_id,
          amount,
          currency: payment.currency,
          status: 'completed',
          item_type: payment.invoice_payload?.includes('subscription') ? 'subscription' : 'donation',
          metadata: payment,
          completed_at: new Date().toISOString(),
        }).select().single()

        return jsonResponse(req, { ok: true, transaction }, 200)
      }

      return jsonResponse(req, { ok: true, message: 'Event logged' }, 200)
    }

    // ===== Tribute Pay webhook =====
    if (source === 'tribute') {
      const tributeSecret = Deno.env.get('TRIBUTE_WEBHOOK_SECRET') ?? Deno.env.get('TRIBUTE_API_KEY')
      if (!tributeSecret) {
        console.error('TRIBUTE_WEBHOOK_SECRET (or TRIBUTE_API_KEY) is not set')
        return jsonResponse(req, { error: 'Webhook verification not configured' }, 503)
      }
      const providedSignature = req.headers.get('trbt-signature') ?? ''
      const expectedSignature = await hmacSha256Hex(tributeSecret, rawBody)
      if (!providedSignature || !timingSafeEqual(providedSignature.toLowerCase(), expectedSignature)) {
        return jsonResponse(req, { error: 'Forbidden' }, 403)
      }

      const payload = JSON.parse(rawBody)

      await supabaseAdmin.from('webhook_events').insert({
        source: 'tribute',
        event_type: payload.event || 'unknown',
        payload,
        processed: false,
      })

      if (payload.event === 'payment.completed') {
        const tributeData = payload.data

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

          await supabaseAdmin.rpc('increment_creator_earnings', {
            creator_id: tributeData.recipient_id,
            amount: tributeData.amount,
          })
        }

        return jsonResponse(req, { ok: true, transaction }, 200)
      }

      return jsonResponse(req, { ok: true, message: 'Event logged' }, 200)
    }

    // Generic webhook handler — accepted for logging only, never processed.
    const payload = JSON.parse(rawBody)
    await supabaseAdmin.from('webhook_events').insert({
      source,
      event_type: payload.event || 'unknown',
      payload,
      processed: false,
    })

    return jsonResponse(req, { ok: true, message: 'Webhook received' }, 200)

  } catch (err) {
    return jsonResponse(req, { error: internalError(err) }, 500)
  }
})
