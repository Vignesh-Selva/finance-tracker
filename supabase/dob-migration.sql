-- Add date_of_birth to settings table (replaces age field)
-- Age will be calculated from date_of_birth
ALTER TABLE settings ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Migrate existing age to approximate DOB (set to Jan 1 of birth year)
-- This is a rough approximation - users should update their actual DOB
UPDATE settings 
SET date_of_birth = MAKE_DATE((EXTRACT(YEAR FROM CURRENT_DATE) - age)::integer, 1, 1)
WHERE age IS NOT NULL AND date_of_birth IS NULL;
