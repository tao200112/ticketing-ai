-- Add ticket_kind column to prices table
-- This allows storing the ticket kind for each price, which will be used when creating tickets

-- Add ticket_kind column to prices table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'prices'
        AND column_name = 'ticket_kind'
    ) THEN
        -- 先添加列（允许 NULL）
        ALTER TABLE prices
        ADD COLUMN ticket_kind TEXT;
        
        -- 然后添加 CHECK 约束
        ALTER TABLE prices
        ADD CONSTRAINT prices_ticket_kind_check 
        CHECK (ticket_kind IS NULL OR ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink'));
        
        RAISE NOTICE 'ticket_kind column added to prices table';
    ELSE
        RAISE NOTICE 'ticket_kind column already exists in prices table';
    END IF;
END $$;

-- Create index for ticket_kind in prices table
CREATE INDEX IF NOT EXISTS idx_prices_ticket_kind ON prices(ticket_kind);

