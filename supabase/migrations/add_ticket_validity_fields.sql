-- Add Ticket Validity Fields
-- Add fields to support unlimited entry within validity window and user information tracking
-- Run this in Supabase SQL Editor

-- ========================================
-- Step 1: Add validity fields to tickets table
-- ========================================

-- Add validity_start_time and validity_end_time for ticket validity window
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS validity_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validity_end_time TIMESTAMPTZ;

-- Add holder_name and holder_age for attendee information
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS holder_name TEXT,
ADD COLUMN IF NOT EXISTS holder_age INTEGER;

-- Add verification tracking fields
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Create indexes for validity checks
CREATE INDEX IF NOT EXISTS idx_tickets_validity ON tickets(validity_start_time, validity_end_time);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ========================================
-- Step 2: Update events table (if needed)
-- ========================================

-- Ensure events table has proper time fields
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- ========================================
-- Step 3: Add helpful comments
-- ========================================

COMMENT ON COLUMN tickets.validity_start_time IS 'Start time when ticket becomes valid for entry';
COMMENT ON COLUMN tickets.validity_end_time IS 'End time when ticket expires (no entry after this)';
COMMENT ON COLUMN tickets.holder_name IS 'Name of ticket holder (for verification display)';
COMMENT ON COLUMN tickets.holder_age IS 'Age of ticket holder (for verification display)';
COMMENT ON COLUMN tickets.verification_count IS 'Total number of times this ticket has been verified';
COMMENT ON COLUMN tickets.first_verified_at IS 'Timestamp of first verification';
COMMENT ON COLUMN tickets.last_verified_at IS 'Timestamp of most recent verification';

-- ========================================
-- Verification query
-- ========================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'validity_end_time'
    ) THEN 'Migration successful: Validity fields added to tickets table'
    ELSE 'Migration failed: Validity fields not found'
  END AS migration_status;


