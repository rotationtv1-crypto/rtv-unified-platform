-- Live pay path is PayPal only while Tribute / Stars / Stripe / TON are down.
-- Existing rows are kept for audit. New credits must be provider = paypal.

-- 1. Enum: add paypal if missing (PG 15+ ADD VALUE IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_provider' AND e.enumlabel = 'paypal'
  ) THEN
    ALTER TYPE public.payment_provider ADD VALUE 'paypal';
  END IF;
END
$$;

-- 2. Portal registry (source of truth for which rails are live).
CREATE TABLE IF NOT EXISTS public.payment_portals (
  provider TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_portals_read" ON public.payment_portals;
CREATE POLICY "payment_portals_read"
  ON public.payment_portals FOR SELECT
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.payment_portals FROM anon, authenticated;
GRANT SELECT ON public.payment_portals TO anon, authenticated;
GRANT ALL ON public.payment_portals TO service_role;

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

-- 3. Guard: reject writes to pay tables unless the portal is enabled.
CREATE OR REPLACE FUNCTION public.enforce_live_payment_portal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  src TEXT;
BEGIN
  IF TG_TABLE_NAME = 'webhook_events' THEN
    src := NEW.source;
  ELSE
    src := NEW.provider::TEXT;
  END IF;

  -- webhook sources use the same names as providers; unknown sources still log
  IF TG_TABLE_NAME = 'webhook_events' THEN
    IF EXISTS (
      SELECT 1 FROM public.payment_portals p
       WHERE p.provider = src AND p.enabled = false
    ) THEN
      NEW.processed := false;
      NEW.error_message := coalesce(NEW.error_message, '') ||
        ' portal_disabled:' || src;
      -- keep the audit row, do not credit
      RETURN NEW;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payment_portals p
     WHERE p.provider = src AND p.enabled = true
  ) THEN
    RAISE EXCEPTION 'payment portal disabled: %', src
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_live_portal ON public.transactions;
CREATE TRIGGER trg_transactions_live_portal
  BEFORE INSERT OR UPDATE OF provider, status
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_live_payment_portal();

DROP TRIGGER IF EXISTS trg_webhook_events_live_portal ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_live_portal
  BEFORE INSERT OR UPDATE OF source, processed
  ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_live_payment_portal();

-- 4. Earnings column that actually exists on creators.
CREATE OR REPLACE FUNCTION public.increment_creator_earnings(
  creator_id UUID,
  amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'creator_id required';
  END IF;
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE public.creators
     SET total_tips_received = COALESCE(total_tips_received, 0) + amount,
         updated_at = now()
   WHERE id = creator_id;

  IF NOT FOUND THEN
    UPDATE public.creators
       SET total_tips_received = COALESCE(total_tips_received, 0) + amount,
           updated_at = now()
     WHERE profile_id = creator_id;
  END IF;
END;
$$;

-- 5. Helper: flip a portal without editing the trigger.
CREATE OR REPLACE FUNCTION public.set_payment_portal(
  p_provider TEXT,
  p_enabled BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.payment_portals (provider, enabled, reason)
  VALUES (p_provider, p_enabled, p_reason)
  ON CONFLICT (provider) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        reason = COALESCE(EXCLUDED.reason, public.payment_portals.reason),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_payment_portal(TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_payment_portal(TEXT, BOOLEAN, TEXT)
  TO service_role;
