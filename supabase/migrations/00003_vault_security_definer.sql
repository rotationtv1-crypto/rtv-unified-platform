-- Vault + earnings helpers.
-- SECURITY DEFINER runs as the owner; lock search_path and grants so
-- anon/authenticated cannot dump vault.decrypted_secrets.
-- Secret *values* are never committed. Insert them in Dashboard → Vault.

CREATE SCHEMA IF NOT EXISTS app;

REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO service_role;

-- ---------------------------------------------------------------------------
-- Vault surface: ciphertext table stays, plaintext view is locked down.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'vault'
  ) THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated;
    GRANT USAGE ON SCHEMA vault TO postgres, service_role;
    GRANT SELECT ON vault.secrets TO service_role;
    GRANT SELECT ON vault.decrypted_secrets TO service_role;
  END IF;
END
$$;

-- Allowlist of names Edge Functions / RPCs may request.
CREATE TABLE IF NOT EXISTS app.vault_allowlist (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app.vault_allowlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON app.vault_allowlist FROM PUBLIC, anon, authenticated;
GRANT SELECT ON app.vault_allowlist TO service_role;

INSERT INTO app.vault_allowlist (name, description) VALUES
  ('tribute_webhook_secret', 'HMAC key for Tribute callbacks'),
  ('tribute_api_key',        'Tribute API key if distinct from webhook secret'),
  ('telegram_bot_token',     'Bot token for Stars pre-checkout replies')
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION app.vault_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, vault, app
AS $$
DECLARE
  v TEXT;
BEGIN
  IF p_name IS NULL OR length(p_name) = 0 THEN
    RAISE EXCEPTION 'vault name required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM app.vault_allowlist a WHERE a.name = p_name) THEN
    RAISE EXCEPTION 'vault name not allowlisted: %', p_name
      USING ERRCODE = '42501';
  END IF;

  SELECT d.decrypted_secret
    INTO v
    FROM vault.decrypted_secrets d
   WHERE d.name = p_name
   LIMIT 1;

  RETURN v; -- NULL if the row was not created in Vault UI yet
END;
$$;

COMMENT ON FUNCTION app.vault_secret(TEXT) IS
  'Returns one allowlisted Vault plaintext. service_role only. No client GRANT.';

REVOKE ALL ON FUNCTION app.vault_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.vault_secret(TEXT) TO service_role;

-- Existence check without returning the value (safe for operator dashboards).
CREATE OR REPLACE FUNCTION app.vault_secret_configured(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, vault, app
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.vault_allowlist a WHERE a.name = p_name) THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM vault.decrypted_secrets d
     WHERE d.name = p_name
       AND d.decrypted_secret IS NOT NULL
       AND length(d.decrypted_secret) > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION app.vault_secret_configured(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.vault_secret_configured(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Earnings increment used by webhook-tribute.
-- ---------------------------------------------------------------------------
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
     SET earnings_total = COALESCE(earnings_total, 0) + amount,
         updated_at = now()
   WHERE id = creator_id;

  IF NOT FOUND THEN
    UPDATE public.creators
       SET earnings_total = COALESCE(earnings_total, 0) + amount,
           updated_at = now()
     WHERE profile_id = creator_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_creator_earnings(UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_creator_earnings(UUID, NUMERIC)
  TO service_role;
