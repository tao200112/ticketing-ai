-- Add title column to activities table
-- This migration adds a title field for each activity

-- Add title to activities table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE activities
        ADD COLUMN title TEXT;
    END IF;
END $$;

-- Update existing activities to have a default title if null
UPDATE activities
SET title = COALESCE(title, 'Activity ' || SUBSTRING(id::text, 1, 8))
WHERE title IS NULL;

