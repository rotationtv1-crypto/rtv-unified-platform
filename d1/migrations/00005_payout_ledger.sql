-- Payout ledger for Stripe + PayPal creator payouts
CREATE TABLE IF NOT EXISTS payout_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  method TEXT NOT NULL CHECK (method IN ('stripe', 'paypal')),
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(transaction_id)
);

CREATE INDEX idx_payout_creator ON payout_ledger(creator_id);
CREATE INDEX idx_payout_status ON payout_ledger(status);
