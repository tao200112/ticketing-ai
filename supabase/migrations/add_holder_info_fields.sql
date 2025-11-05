-- Add Holder Information Fields to Tickets and Orders Tables
-- This migration adds holder_name and holder_age to tickets table
-- and ensures customer_name and customer_age exist in orders table
-- Run this in Supabase SQL Editor

-- ========================================
-- Add holder information fields to tickets table
-- ========================================

-- Add holder_name (ticket holder's name for ID verification)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS holder_name TEXT;

-- Add holder_age (ticket holder's age for ID verification)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS holder_age INTEGER;

-- ========================================
-- Ensure customer information fields exist in orders table
-- ========================================

-- customer_name should already exist, but ensure it does
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add customer_age to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_age INTEGER;

-- ========================================
-- Create indexes for better query performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tickets_holder_name ON tickets(holder_name);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_age ON tickets(holder_age);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- ========================================
-- Add helpful comments
-- ========================================

COMMENT ON COLUMN tickets.holder_name IS 'Name of the ticket holder (for ID verification at entry)';
COMMENT ON COLUMN tickets.holder_age IS 'Age of the ticket holder (for ID verification at entry)';
COMMENT ON COLUMN orders.customer_name IS 'Name of the customer who purchased the tickets';
COMMENT ON COLUMN orders.customer_age IS 'Age of the customer who purchased the tickets';

-- ========================================
-- Update existing tickets with holder information from orders
-- ========================================

-- Update tickets with holder_name from orders if missing
UPDATE tickets t
SET holder_name = o.customer_name
FROM orders o
WHERE t.order_id = o.id
  AND (t.holder_name IS NULL OR t.holder_name = '')
  AND o.customer_name IS NOT NULL
  AND o.customer_name != '';

-- Update tickets with holder_age from orders if missing
UPDATE tickets t
SET holder_age = o.customer_age
FROM orders o
WHERE t.order_id = o.id
  AND t.holder_age IS NULL
  AND o.customer_age IS NOT NULL
  AND o.customer_age > 0;

-- ========================================
-- Verification query - check if fields exist
-- ========================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'holder_name'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'holder_age'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'customer_name'
    ) THEN 'Migration successful: All holder information fields added'
    ELSE 'Migration failed: Some fields are missing'
  END AS migration_status;
