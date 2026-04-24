-- ============================================================
-- Finance Tracker — Order History Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Creates mf_orders, stock_orders, crypto_orders tables
-- ============================================================

-- ── Mutual Fund Orders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS mf_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  mf_id UUID NOT NULL REFERENCES mutual_funds(id) ON DELETE CASCADE,
  execution_date TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('Buy', 'Sell')),
  units NUMERIC(18,8) NOT NULL CHECK (units > 0),
  nav NUMERIC(18,4) NOT NULL CHECK (nav > 0),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  charges NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (charges >= 0),
  platform TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  amount_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mf_orders_portfolio_id ON mf_orders(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_mf_orders_mf_id ON mf_orders(mf_id);
CREATE INDEX IF NOT EXISTS idx_mf_orders_execution_date ON mf_orders(execution_date);

-- ── Stock / ETF Orders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  execution_date TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('Buy', 'Sell')),
  quantity NUMERIC(18,8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(18,4) NOT NULL CHECK (price > 0),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  charges NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (charges >= 0),
  platform TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  amount_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_orders_portfolio_id ON stock_orders(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_stock_orders_stock_id ON stock_orders(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_orders_execution_date ON stock_orders(execution_date);

-- ── Crypto Orders ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crypto_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  crypto_id UUID NOT NULL REFERENCES crypto(id) ON DELETE CASCADE,
  execution_date TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('Buy', 'Sell')),
  quantity NUMERIC(18,8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(18,4) NOT NULL CHECK (price > 0),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  charges NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (charges >= 0),
  platform TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  amount_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_orders_portfolio_id ON crypto_orders(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_crypto_orders_crypto_id ON crypto_orders(crypto_id);
CREATE INDEX IF NOT EXISTS idx_crypto_orders_execution_date ON crypto_orders(execution_date);

-- ── updated_at triggers ────────────────────────────────────
CREATE TRIGGER update_mf_orders_updated_at
  BEFORE UPDATE ON mf_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_orders_updated_at
  BEFORE UPDATE ON stock_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_crypto_orders_updated_at
  BEFORE UPDATE ON crypto_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE mf_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_orders ENABLE ROW LEVEL SECURITY;

-- mf_orders
CREATE POLICY "Users can view own mf_orders" ON mf_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mf_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create own mf_orders" ON mf_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mf_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update own mf_orders" ON mf_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mf_orders.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mf_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete own mf_orders" ON mf_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mf_orders.portfolio_id AND portfolios.user_id = auth.uid()));

-- stock_orders
CREATE POLICY "Users can view own stock_orders" ON stock_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stock_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create own stock_orders" ON stock_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stock_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update own stock_orders" ON stock_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stock_orders.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stock_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete own stock_orders" ON stock_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stock_orders.portfolio_id AND portfolios.user_id = auth.uid()));

-- crypto_orders
CREATE POLICY "Users can view own crypto_orders" ON crypto_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create own crypto_orders" ON crypto_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update own crypto_orders" ON crypto_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto_orders.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto_orders.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete own crypto_orders" ON crypto_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto_orders.portfolio_id AND portfolios.user_id = auth.uid()));
