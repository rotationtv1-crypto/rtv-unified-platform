-- Prevent replayed/provider-retried webhook bodies from being processed twice.
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS event_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_source_event_hash_unique
  ON public.webhook_events (source, event_hash)
  WHERE event_hash IS NOT NULL;

-- Prevent duplicate provider transactions from double-crediting creator earnings.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_provider_transaction_id_unique
  ON public.transactions (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
