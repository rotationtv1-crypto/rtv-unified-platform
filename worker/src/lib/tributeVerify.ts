/**
 * Tribute webhook signature verification.
 * Validates HMAC-SHA256 signatures from Tribute payment webhooks.
 */

const encoder = new TextEncoder();

export async function verifyTributeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!payload || !signature || !secret) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (signature.length !== expectedHex.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface TributeWebhookEvent {
  event: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    creator_id: string;
    supporter_name: string;
    message?: string;
    created_at: string;
  };
}

export function parseTributeEvent(body: string): TributeWebhookEvent | null {
  try {
    const parsed = JSON.parse(body);
    if (!parsed.event || !parsed.data?.id) return null;
    return parsed as TributeWebhookEvent;
  } catch {
    return null;
  }
}
