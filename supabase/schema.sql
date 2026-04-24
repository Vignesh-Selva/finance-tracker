-- ============================================================
-- Finance Tracker — Supabase (PostgreSQL) Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PORTFOLIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SAVINGS ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_type TEXT DEFAULT 'Savings',
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FIXED DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS fixed_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  invested NUMERIC DEFAULT 0,
  maturity NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  start_date TEXT,
  maturity_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MUTUAL FUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS mutual_funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  fund_name TEXT NOT NULL,
  scheme_code TEXT DEFAULT '',
  units NUMERIC DEFAULT 0,
  invested NUMERIC DEFAULT 0,
  current NUMERIC DEFAULT 0,
  fund_type TEXT DEFAULT 'Equity',
  sip NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_name TEXT NOT NULL,
  ticker TEXT DEFAULT '',
  quantity NUMERIC DEFAULT 0,
  invested NUMERIC DEFAULT 0,
  current NUMERIC DEFAULT 0,
  sector TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CRYPTO
-- ============================================================
CREATE TABLE IF NOT EXISTS crypto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  coin_name TEXT NOT NULL,
  platform TEXT DEFAULT '',
  quantity NUMERIC DEFAULT 0,
  invested NUMERIC DEFAULT 0,
  current NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LIABILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  lender TEXT DEFAULT '',
  loan_amount NUMERIC DEFAULT 0,
  outstanding NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  emi NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CREDIT CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  card_type TEXT NOT NULL,
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  statement_balance NUMERIC DEFAULT 0,
  amount_to_pay NUMERIC DEFAULT 0,
  billing_date TEXT,
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  amount NUMERIC NOT NULL,
  units NUMERIC,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'INR',
  display_currency TEXT DEFAULT 'INR',
  goal NUMERIC DEFAULT 15000000,
  epf NUMERIC DEFAULT 0,
  ppf NUMERIC DEFAULT 0,
  theme TEXT DEFAULT 'light',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NET WORTH SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  total_assets NUMERIC DEFAULT 0,
  total_liabilities NUMERIC DEFAULT 0,
  net_worth NUMERIC DEFAULT 0,
  savings NUMERIC DEFAULT 0,
  fixed_deposits NUMERIC DEFAULT 0,
  mutual_funds NUMERIC DEFAULT 0,
  stocks NUMERIC DEFAULT 0,
  crypto NUMERIC DEFAULT 0,
  epf NUMERIC DEFAULT 0,
  ppf NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portfolio_id, snapshot_date)
);

-- ============================================================
-- PRICE CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS price_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_type, identifier, currency)
);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS) — disabled for now, enable with auth later
-- ============================================================
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (public access, no auth required)
-- Replace with proper user-based policies when adding authentication
CREATE POLICY "Allow all for anon" ON portfolios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON savings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON fixed_deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON mutual_funds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON stocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON crypto FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON liabilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON credit_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON net_worth_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON price_cache FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_savings_updated_at BEFORE UPDATE ON savings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_fixed_deposits_updated_at BEFORE UPDATE ON fixed_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_mutual_funds_updated_at BEFORE UPDATE ON mutual_funds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_crypto_updated_at BEFORE UPDATE ON crypto FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEFAULT SEED DATA
-- ============================================================
INSERT INTO portfolios (name, description, currency)
VALUES ('Default Portfolio', 'Primary investment portfolio', 'INR');

INSERT INTO settings (portfolio_id, currency, goal, epf, ppf, theme)
SELECT id, 'INR', 15000000, 0, 0, 'light'
FROM portfolios
WHERE name = 'Default Portfolio';
