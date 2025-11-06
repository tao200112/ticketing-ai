-- Add sort_order column to events table for homepage featured display
-- Lower sort_order values appear first (top 3 displayed on homepage)

-- Add sort_order to events table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE events
        ADD COLUMN sort_order INTEGER DEFAULT 999999;
    END IF;
END $$;

-- Update existing events to have different sort_order values
-- Set first 3 events (if any) to sort_order 1, 2, 3
UPDATE events
SET sort_order = subquery.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
    FROM events
    LIMIT 3
) AS subquery
WHERE events.id = subquery.id AND subquery.row_num <= 3;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_events_sort_order ON events(sort_order);

-- Add sort_order to activities table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE activities
        ADD COLUMN sort_order INTEGER DEFAULT 999999;
    END IF;
END $$;

-- Update existing activities to have different sort_order values
-- Set first 3 activities (if any) to sort_order 1, 2, 3
UPDATE activities
SET sort_order = subquery.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
    FROM activities
    LIMIT 3
) AS subquery
WHERE activities.id = subquery.id AND subquery.row_num <= 3;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_activities_sort_order ON activities(sort_order);

