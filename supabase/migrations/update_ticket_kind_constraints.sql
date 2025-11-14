-- Update ticket_kind constraints to support new ticket types
-- This migration updates the CHECK constraint to include:
-- ENTRY_18_20, ENTRY_21_PLUS, ENTRY_LINE_SKIP, ENTRY_COMBO, DRINK_COMBO, OTHER

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop the old constraint on tickets table
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'tickets_ticket_kind_check'
        AND table_name = 'tickets'
    ) THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_ticket_kind_check;
    END IF;
    
    -- Drop the old constraint on prices table if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'prices_ticket_kind_check'
        AND table_name = 'prices'
    ) THEN
        ALTER TABLE prices DROP CONSTRAINT prices_ticket_kind_check;
    END IF;
END $$;

-- Add new constraint to tickets table with all new ticket kinds
ALTER TABLE tickets
ADD CONSTRAINT tickets_ticket_kind_check 
CHECK (ticket_kind IS NULL OR ticket_kind IN (
    'ENTRY_18_20',
    'ENTRY_21_PLUS',
    'ENTRY_LINE_SKIP',
    'ENTRY_COMBO',
    'DRINK_COMBO',
    'OTHER',
    -- Legacy values for backward compatibility
    'entry_18_20',
    'entry_21_plus',
    'queue',
    'drink',
    'combo'
));

-- Add new constraint to prices table
ALTER TABLE prices
ADD CONSTRAINT prices_ticket_kind_check 
CHECK (ticket_kind IS NULL OR ticket_kind IN (
    'ENTRY_18_20',
    'ENTRY_21_PLUS',
    'ENTRY_LINE_SKIP',
    'ENTRY_COMBO',
    'DRINK_COMBO',
    'OTHER',
    -- Legacy values for backward compatibility
    'entry_18_20',
    'entry_21_plus',
    'queue',
    'drink',
    'combo'
));

-- Create ticket_redemptions table for redemption logging
CREATE TABLE IF NOT EXISTS ticket_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ticket_kind TEXT,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    redeem_source TEXT DEFAULT 'customer_phone',
    redeem_location TEXT CHECK (redeem_location IN ('door', 'bar', 'other')),
    redeemed_by TEXT, -- Staff member identifier if available
    metadata JSONB, -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for ticket_redemptions
CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_ticket_id ON ticket_redemptions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_user_id ON ticket_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_redeemed_at ON ticket_redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_ticket_kind ON ticket_redemptions(ticket_kind);

-- Add comment to table
COMMENT ON TABLE ticket_redemptions IS 'Logs all ticket redemptions for audit and dispute resolution';

