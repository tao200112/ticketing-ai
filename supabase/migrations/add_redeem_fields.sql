-- Add Redeem Fields to Tickets Table
-- This migration adds the necessary fields for ticket redemption tracking
-- Run this in Supabase SQL Editor if fields are missing

-- ========================================
-- Add redemption tracking fields to tickets table
-- ========================================

-- Add redeemed_by (who redeemed the ticket - merchant user ID)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add redeemed_at (when the ticket was redeemed)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- Add last_verified_at (last verification timestamp)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Add first_verified_at (first verification timestamp)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS first_verified_at TIMESTAMPTZ;

-- Add verification_count (number of times verified)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

-- ========================================
-- Create indexes for better query performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_by ON tickets(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_at ON tickets(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_tickets_last_verified_at ON tickets(last_verified_at);

-- ========================================
-- Add helpful comments
-- ========================================

COMMENT ON COLUMN tickets.redeemed_by IS 'User ID (merchant staff) who redeemed this ticket';
COMMENT ON COLUMN tickets.redeemed_at IS 'Timestamp when ticket was redeemed (marked as used)';
COMMENT ON COLUMN tickets.last_verified_at IS 'Timestamp of most recent verification';
COMMENT ON COLUMN tickets.first_verified_at IS 'Timestamp of first verification';
COMMENT ON COLUMN tickets.verification_count IS 'Total number of times this ticket has been verified';

-- ========================================
-- Verification query - check if fields exist
-- ========================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'redeemed_by'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'redeemed_at'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'last_verified_at'
    ) THEN 'Migration successful: All redeem fields added to tickets table'
    ELSE 'Migration failed: Some fields are missing'
  END AS migration_status;

