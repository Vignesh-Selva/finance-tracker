-- ============================================================
-- Advisor / Financial Profile — settings table extension
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS salary           NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS expenses         NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_regime       TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS retirement_years INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS emergency_fund   NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS emergency_fund_location TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS btc_cap          NUMERIC DEFAULT 10;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS context_note     TEXT;
