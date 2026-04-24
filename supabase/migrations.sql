-- Multi-Currency: add display_currency to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'INR';

-- Recurring Transactions: new table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('income','expense')),
  category     TEXT,
  frequency    TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  day_of_month INTEGER,
  next_date    DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring transactions"
  ON recurring_transactions FOR ALL
  USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));