-- Add Ticket Snapshot Fields
-- Add fields to store event and price snapshot information
-- This ensures ticket information persists even if event is deleted or price is modified
-- Run this in Supabase SQL Editor

-- ========================================
-- Step 1: Add snapshot fields to tickets table
-- ========================================

-- Add event snapshot fields
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS event_title_snapshot TEXT,
ADD COLUMN IF NOT EXISTS event_description_snapshot TEXT,
ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT,
ADD COLUMN IF NOT EXISTS event_address_snapshot TEXT,
ADD COLUMN IF NOT EXISTS event_start_at_snapshot TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS event_end_at_snapshot TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS event_poster_url_snapshot TEXT;

-- Add price snapshot fields
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS price_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS price_amount_cents_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS price_currency_snapshot TEXT DEFAULT 'USD';

-- ========================================
-- Step 2: Add helpful comments
-- ========================================

COMMENT ON COLUMN tickets.event_title_snapshot IS 'Snapshot of event title at time of purchase';
COMMENT ON COLUMN tickets.event_description_snapshot IS 'Snapshot of event description at time of purchase';
COMMENT ON COLUMN tickets.event_venue_snapshot IS 'Snapshot of event venue name at time of purchase';
COMMENT ON COLUMN tickets.event_address_snapshot IS 'Snapshot of event address at time of purchase';
COMMENT ON COLUMN tickets.event_start_at_snapshot IS 'Snapshot of event start time at time of purchase';
COMMENT ON COLUMN tickets.event_end_at_snapshot IS 'Snapshot of event end time at time of purchase';
COMMENT ON COLUMN tickets.event_poster_url_snapshot IS 'Snapshot of event poster URL at time of purchase';
COMMENT ON COLUMN tickets.price_name_snapshot IS 'Snapshot of price name at time of purchase';
COMMENT ON COLUMN tickets.price_amount_cents_snapshot IS 'Snapshot of price amount in cents at time of purchase';
COMMENT ON COLUMN tickets.price_currency_snapshot IS 'Snapshot of price currency at time of purchase';

-- ========================================
-- Step 3: Verification query
-- ========================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'event_title_snapshot'
    ) THEN 'Migration successful: Snapshot fields added to tickets table'
    ELSE 'Migration failed: Snapshot fields not found'
  END AS migration_status;

