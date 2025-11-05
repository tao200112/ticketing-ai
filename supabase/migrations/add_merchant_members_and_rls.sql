-- Add Merchant Members Table and RLS Policies
-- This migration adds:
-- 1. merchant_members table for internal merchant roles (boss/staff)
-- 2. redeemed_by and redeemed_at fields to tickets table
-- 3. RLS policies for events, orders, and tickets tables

-- ========================================
-- Step 1: Create merchant_members table
-- ========================================

CREATE TABLE IF NOT EXISTS merchant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('boss', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, user_id)
);

-- Create indexes for merchant_members
CREATE INDEX IF NOT EXISTS idx_merchant_members_merchant_id ON merchant_members(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_user_id ON merchant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_role ON merchant_members(role);

-- Add comment
COMMENT ON TABLE merchant_members IS 'Internal merchant team members with roles (boss/staff)';
COMMENT ON COLUMN merchant_members.role IS 'Role: boss (full access) or staff (scan only)';

-- ========================================
-- Step 2: Add redemption fields to tickets table
-- ========================================

-- Add redeemed_by (who redeemed the ticket) and redeemed_at (when redeemed)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- Create index for redemption queries
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_by ON tickets(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_at ON tickets(redeemed_at);

-- Add comments
COMMENT ON COLUMN tickets.redeemed_by IS 'User ID who redeemed this ticket (from merchant_members)';
COMMENT ON COLUMN tickets.redeemed_at IS 'Timestamp when ticket was redeemed';

-- ========================================
-- Step 3: Enable RLS on tables
-- ========================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_members ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 4: Create RLS policies for events
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Events: Access for merchant members and owners" ON events;
DROP POLICY IF EXISTS "Events: Access for authenticated merchant users" ON events;

-- Policy: Allow access if user is a merchant member OR is the merchant owner
CREATE POLICY "Events: Access for merchant members and owners"
ON events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM merchant_members mm
    WHERE mm.merchant_id = events.merchant_id
    AND mm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM merchants m
    WHERE m.id = events.merchant_id
    AND m.owner_user_id = auth.uid()
  )
);

-- ========================================
-- Step 5: Create RLS policies for orders
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Orders: Access for merchant members and owners" ON orders;
DROP POLICY IF EXISTS "Orders: Access for authenticated merchant users" ON orders;

-- Policy: Allow access if order belongs to merchant where user is a member OR owner
CREATE POLICY "Orders: Access for merchant members and owners"
ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON t.event_id = e.id
    JOIN merchant_members mm ON mm.merchant_id = e.merchant_id
    WHERE t.order_id = orders.id
    AND mm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tickets t
    JOIN events e ON t.event_id = e.id
    JOIN merchants m ON m.id = e.merchant_id
    WHERE t.order_id = orders.id
    AND m.owner_user_id = auth.uid()
  )
);

-- ========================================
-- Step 6: Create RLS policies for tickets
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tickets: Access for merchant members and owners" ON tickets;
DROP POLICY IF EXISTS "Tickets: Access for authenticated merchant users" ON tickets;

-- Policy: Allow access if ticket belongs to event from merchant where user is a member OR owner
CREATE POLICY "Tickets: Access for merchant members and owners"
ON tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN merchant_members mm ON mm.merchant_id = e.merchant_id
    WHERE e.id = tickets.event_id
    AND mm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM events e
    JOIN merchants m ON m.id = e.merchant_id
    WHERE e.id = tickets.event_id
    AND m.owner_user_id = auth.uid()
  )
);

-- Policy: Allow update (for redemption) if ticket belongs to event from merchant where user is a member OR owner
CREATE POLICY "Tickets: Update for merchant members and owners"
ON tickets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN merchant_members mm ON mm.merchant_id = e.merchant_id
    WHERE e.id = tickets.event_id
    AND mm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM events e
    JOIN merchants m ON m.id = e.merchant_id
    WHERE e.id = tickets.event_id
    AND m.owner_user_id = auth.uid()
  )
);

-- ========================================
-- Step 7: Create RLS policy for merchant_members
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Merchant Members: Access own membership" ON merchant_members;

-- Policy: Users can see their own merchant memberships
CREATE POLICY "Merchant Members: Access own membership"
ON merchant_members
FOR SELECT
USING (user_id = auth.uid());

-- ========================================
-- Verification queries
-- ========================================

-- Test 1: Check if merchant_members table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'merchant_members'
    ) THEN '✅ Migration successful: merchant_members table exists'
    ELSE '❌ Migration failed: merchant_members table not found'
  END AS merchant_members_status;

-- Test 2: Check if redemption fields exist
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
    ) THEN '✅ Migration successful: Redemption fields added to tickets'
    ELSE '❌ Migration failed: Redemption fields not found'
  END AS redemption_fields_status;

-- Test 3: Check if RLS is enabled
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE t.schemaname = 'public'
      AND t.tablename IN ('events', 'orders', 'tickets', 'merchant_members')
      AND c.relrowsecurity = true
    ) THEN '✅ Migration successful: RLS enabled on required tables'
    ELSE '⚠️ Warning: RLS may not be enabled on all tables'
  END AS rls_status;

