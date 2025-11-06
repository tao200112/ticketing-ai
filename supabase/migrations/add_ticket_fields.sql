-- Add new fields to tickets table for ticket kind and usage tracking
-- This migration adds ticket_kind, used, used_at, used_method, and used_context fields

-- Add ticket_kind column (entry_18_20, entry_21_plus, queue, drink)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tickets'
        AND column_name = 'ticket_kind'
    ) THEN
        ALTER TABLE tickets
        ADD COLUMN ticket_kind TEXT CHECK (ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink'));
    END IF;
END $$;

-- Add used column (boolean, default false)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tickets'
        AND column_name = 'used'
    ) THEN
        ALTER TABLE tickets
        ADD COLUMN used BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add used_at column (timestamp)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tickets'
        AND column_name = 'used_at'
    ) THEN
        ALTER TABLE tickets
        ADD COLUMN used_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add used_method column (text, e.g., 'triple_click', 'qr_scan', etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tickets'
        AND column_name = 'used_method'
    ) THEN
        ALTER TABLE tickets
        ADD COLUMN used_method TEXT;
    END IF;
END $$;

-- Add used_context column (JSONB for additional context)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tickets'
        AND column_name = 'used_context'
    ) THEN
        ALTER TABLE tickets
        ADD COLUMN used_context JSONB;
    END IF;
END $$;

-- Update existing tickets: if status = 'used', set used = true and used_at = used_at (if exists)
UPDATE tickets
SET used = true,
    used_at = COALESCE(used_at, created_at)
WHERE status = 'used' AND (used IS NULL OR used = false);

-- Create index for ticket_kind
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_kind ON tickets(ticket_kind);

-- Create index for used
CREATE INDEX IF NOT EXISTS idx_tickets_used ON tickets(used);

