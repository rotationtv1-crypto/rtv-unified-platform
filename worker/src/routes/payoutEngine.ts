import { Env } from '../types';

interface PayoutRequest {
  creatorId: string;
  amount: number;
  currency: string;
  method: 'stripe' | 'paypal';
  destinationId: string;
}

interface PayoutResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

async function processStripePayout(
  env: Env,
  payout: PayoutRequest
): Promise<PayoutResult> {
  const res = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(Math.round(payout.amount * 100)),
      currency: payout.currency,
      destination: payout.destinationId,
      transfer_group: `rtv-payout-${payout.creatorId}`,
    }),
  });

  if (!res.ok) {
    const err = await res.json<any>();
    return { success: false, error: err.error?.message || 'Stripe transfer failed' };
  }

  const data = await res.json<any>();
  return { success: true, transactionId: data.id };
}

async function processPayPalPayout(
  env: Env,
  payout: PayoutRequest
): Promise<PayoutResult> {
  // Get OAuth token
  const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!authRes.ok) {
    return { success: false, error: 'PayPal auth failed' };
  }

  const { access_token } = await authRes.json<any>();

  // Create payout
  const payoutRes = await fetch('https://api-m.paypal.com/v1/payments/payouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `rtv-${Date.now()}-${payout.creatorId}`,
        email_subject: 'RotationTV Creator Payout',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: payout.amount.toFixed(2), currency: payout.currency.toUpperCase() },
          receiver: payout.destinationId,
          note: 'RotationTV creator earnings payout',
        },
      ],
    }),
  });

  if (!payoutRes.ok) {
    const err = await payoutRes.json<any>();
    return { success: false, error: err.message || 'PayPal payout failed' };
  }

  const data = await payoutRes.json<any>();
  return { success: true, transactionId: data.batch_header?.payout_batch_id };
}

export async function handlePayout(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<PayoutRequest>();

  if (!body.creatorId || !body.amount || !body.method || !body.destinationId) {
    return Response.json(
      { error: 'Missing required fields: creatorId, amount, method, destinationId' },
      { status: 400 }
    );
  }

  if (body.amount < 1) {
    return Response.json({ error: 'Minimum payout is $1.00' }, { status: 400 });
  }

  let result: PayoutResult;

  if (body.method === 'stripe') {
    result = await processStripePayout(env, body);
  } else if (body.method === 'paypal') {
    result = await processPayPalPayout(env, body);
  } else {
    return Response.json({ error: 'Invalid method. Use stripe or paypal.' }, { status: 400 });
  }

  // Log payout to D1
  await env.DB.prepare(
    `INSERT INTO payout_ledger (creator_id, amount, currency, method, transaction_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.creatorId,
      body.amount,
      body.currency || 'usd',
      body.method,
      result.transactionId || null,
      result.success ? 'completed' : 'failed',
      new Date().toISOString()
    )
    .run();

  const status = result.success ? 200 : 502;
  return Response.json(result, { status });
}
