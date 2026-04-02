-- ============================================================
-- Finance Tracker — Auth Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- This migration:
--   1. Adds a user_id column to portfolios referencing auth.users(id)
--   2. Drops the old "Allow all for anon" policies on every table
--   3. Creates user-scoped RLS policies so each user only sees their own data
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add user_id to portfolios
-- ────────────────────────────────────────────────────────────
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- ────────────────────────────────────────────────────────────
-- 2. Drop old open policies
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all for anon" ON portfolios;
DROP POLICY IF EXISTS "Allow all for anon" ON savings;
DROP POLICY IF EXISTS "Allow all for anon" ON fixed_deposits;
DROP POLICY IF EXISTS "Allow all for anon" ON mutual_funds;
DROP POLICY IF EXISTS "Allow all for anon" ON stocks;
DROP POLICY IF EXISTS "Allow all for anon" ON crypto;
DROP POLICY IF EXISTS "Allow all for anon" ON liabilities;
DROP POLICY IF EXISTS "Allow all for anon" ON transactions;
DROP POLICY IF EXISTS "Allow all for anon" ON budgets;
DROP POLICY IF EXISTS "Allow all for anon" ON settings;
DROP POLICY IF EXISTS "Allow all for anon" ON net_worth_snapshots;
DROP POLICY IF EXISTS "Allow all for anon" ON price_cache;

-- ────────────────────────────────────────────────────────────
-- 3. Portfolios — user can only access their own rows
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. Child tables — access only if portfolio_id belongs to user
--    Uses a sub-select: portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
-- ────────────────────────────────────────────────────────────

-- Helper: reusable expression (written inline in each policy)
-- EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = <table>.portfolio_id AND portfolios.user_id = auth.uid())

-- ── savings ──
CREATE POLICY "Users can view own savings"
  ON savings FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = savings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own savings"
  ON savings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = savings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own savings"
  ON savings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = savings.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = savings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own savings"
  ON savings FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = savings.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── fixed_deposits ──
CREATE POLICY "Users can view own fixed_deposits"
  ON fixed_deposits FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = fixed_deposits.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own fixed_deposits"
  ON fixed_deposits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = fixed_deposits.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own fixed_deposits"
  ON fixed_deposits FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = fixed_deposits.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = fixed_deposits.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own fixed_deposits"
  ON fixed_deposits FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = fixed_deposits.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── mutual_funds ──
CREATE POLICY "Users can view own mutual_funds"
  ON mutual_funds FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mutual_funds.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own mutual_funds"
  ON mutual_funds FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mutual_funds.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own mutual_funds"
  ON mutual_funds FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mutual_funds.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mutual_funds.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own mutual_funds"
  ON mutual_funds FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = mutual_funds.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── stocks ──
CREATE POLICY "Users can view own stocks"
  ON stocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stocks.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own stocks"
  ON stocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stocks.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own stocks"
  ON stocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stocks.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stocks.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own stocks"
  ON stocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = stocks.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── crypto ──
CREATE POLICY "Users can view own crypto"
  ON crypto FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own crypto"
  ON crypto FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own crypto"
  ON crypto FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own crypto"
  ON crypto FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = crypto.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── liabilities ──
CREATE POLICY "Users can view own liabilities"
  ON liabilities FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = liabilities.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own liabilities"
  ON liabilities FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = liabilities.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own liabilities"
  ON liabilities FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = liabilities.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = liabilities.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own liabilities"
  ON liabilities FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = liabilities.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── transactions ──
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── budgets ──
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = budgets.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own budgets"
  ON budgets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = budgets.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = budgets.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = budgets.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = budgets.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── settings ──
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = settings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own settings"
  ON settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = settings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = settings.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = settings.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = settings.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── net_worth_snapshots ──
CREATE POLICY "Users can view own snapshots"
  ON net_worth_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = net_worth_snapshots.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can create own snapshots"
  ON net_worth_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = net_worth_snapshots.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can update own snapshots"
  ON net_worth_snapshots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = net_worth_snapshots.portfolio_id AND portfolios.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = net_worth_snapshots.portfolio_id AND portfolios.user_id = auth.uid()));

CREATE POLICY "Users can delete own snapshots"
  ON net_worth_snapshots FOR DELETE
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = net_worth_snapshots.portfolio_id AND portfolios.user_id = auth.uid()));

-- ── price_cache — shared read, authenticated write ──
CREATE POLICY "Authenticated users can read price_cache"
  ON price_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert price_cache"
  ON price_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update price_cache"
  ON price_cache FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- 5. Migration snippet — reassign existing portfolios
--    After you sign up, replace <YOUR_USER_ID> with your auth.users id
--    (find it in Supabase Dashboard → Authentication → Users)
-- ────────────────────────────────────────────────────────────
-- UPDATE portfolios SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;
