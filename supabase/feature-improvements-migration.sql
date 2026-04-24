-- ============================================================
-- Feature Improvements Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add status column to liabilities (for archive/close functionality)
-- Add status column
ALTER TABLE liabilities
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'liabilities_status_check'
        AND conrelid = 'liabilities'::regclass
    ) THEN
        ALTER TABLE liabilities
        ADD CONSTRAINT liabilities_status_check
        CHECK (status IN ('active', 'closed'));
    END IF;
END $$;

ALTER TABLE liabilities
ALTER COLUMN status SET NOT NULL;

-- Add btc_goal column
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS btc_goal NUMERIC(18,8) DEFAULT 1;

ALTER TABLE settings
ALTER COLUMN btc_goal SET NOT NULL;

-- Backfill
UPDATE liabilities SET status = 'active' WHERE status IS NULL;
UPDATE settings SET btc_goal = 1 WHERE btc_goal IS NULL;