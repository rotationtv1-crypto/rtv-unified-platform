import { Env } from '../types';
import { verifyTributeSignature, parseTributeEvent } from '../lib/tributeVerify';

export async function handleTributeWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('x-tribute-signature') || '';
  const body = await request.text();

  // Verify webhook signature
  const isValid = await verifyTributeSignature(body, signature, env.TRIBUTE_API_KEY);
  if (!isValid) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = parseTributeEvent(body);
  if (!event) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Idempotency check
  const existing = await env.DB.prepare(
    `SELECT id FROM webhook_events WHERE provider = 'tribute' AND external_id = ?`
  )
    .bind(event.data.id)
    .first();

  if (existing) {
    return Response.json({ status: 'already_processed' }, { status: 200 });
  }

  // Record the event
  await env.DB.prepare(
    `INSERT INTO webhook_events (provider, external_id, event_type, payload, processed_at)
     VALUES ('tribute', ?, ?, ?, datetime('now'))`
  )
    .bind(event.data.id, event.event, body)
    .run();

  // Process based on event type
  switch (event.event) {
    case 'payment.completed':
      await env.DB.prepare(
        `INSERT INTO tips (creator_id, supporter_name, amount, currency, message, source, created_at)
         VALUES (?, ?, ?, ?, ?, 'tribute', ?)`
      )
        .bind(
          event.data.creator_id,
          event.data.supporter_name,
          event.data.amount,
          event.data.currency,
          event.data.message || '',
          event.data.created_at
        )
        .run();
      break;
    default:
      break;
  }

  return Response.json({ status: 'processed', event: event.event });
}
