-- ============================================================
-- Insurance & Emergency Fund — settings table extension
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS life_insurance BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS health_insurance BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS health_insurance_for_dependents BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS health_insurance_for_spouse BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS emergency_fund_months INTEGER DEFAULT 6;
