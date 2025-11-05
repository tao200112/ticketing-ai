-- Update merchants table to set max_events default value to 1
-- This migration ensures all new merchants start with max_events = 1

-- First, check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'max_events'
    ) THEN
        ALTER TABLE merchants 
        ADD COLUMN max_events INTEGER DEFAULT 1;
    END IF;
END $$;

-- Update existing merchants that have NULL or 0 max_events to 1
UPDATE merchants 
SET max_events = 1 
WHERE max_events IS NULL OR max_events = 0;

-- Alter the default value for new merchants
ALTER TABLE merchants 
ALTER COLUMN max_events SET DEFAULT 1;

