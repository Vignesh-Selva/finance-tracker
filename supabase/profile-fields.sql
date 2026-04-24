-- Add user profile fields to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'));
ALTER TABLE settings ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say'));
ALTER TABLE settings ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive'));
