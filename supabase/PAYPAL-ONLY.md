# PayPal-only live portals

Other processors are marked down. Existing Tribute/Stars/Stripe/TON rows stay for audit.
New `transactions` rows must use `provider = 'paypal'`.

## Apply (SQL editor or CLI)

```bash
supabase db push
```

Or run `supabase/migrations/00004_paypal_only_portals.sql` in the Dashboard SQL editor.

## One-shot commands (already in the migration; safe to re-run the registry piece)

```sql
-- confirm live rails
SELECT provider, enabled, reason FROM public.payment_portals ORDER BY provider;

-- force PayPal only (idempotent)
INSERT INTO public.payment_portals (provider, enabled, reason) VALUES
  ('paypal',         true,  'sole live processor'),
  ('tribute',        false, 'portal down'),
  ('telegram_stars', false, 'portal down'),
  ('stripe',         false, 'portal down'),
  ('ton',            false, 'portal down')
ON CONFLICT (provider) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      reason = EXCLUDED.reason,
      updated_at = now();
```

## Insert a PayPal payment (service role / webhook)

```sql
INSERT INTO public.transactions (
  user_id, provider, provider_transaction_id,
  amount, currency, status, item_type, metadata, completed_at
) VALUES (
  $1, 'paypal', $2,
  $3, 'USD', 'completed', 'subscription',
  jsonb_build_object('paypal_order_id', $2),
  now()
);
```

A Tribute/Stars insert now raises `payment portal disabled`.

Webhook rows for down sources still insert (audit) but get `processed = false` and `error_message` tagged `portal_disabled:<source>`.

## Re-enable later (do not do this while they are down)

```sql
SELECT public.set_payment_portal('tribute', true, 'restored');
-- service_role only
```

## App / Worker

- Checkout UI: PayPal only.
- `webhook-tribute` and Stars handlers should return 503 while portals are false (Function still verifies HMAC if you keep it; DB will refuse credit).
- Cloudflare LivePay Worker should route `/tribute` and `/stars` to 503 until you flip the row.
