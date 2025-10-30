-- Multi-Domain Multi-Role Support Migration
-- Allows same email to register as different roles (customer, merchant, admin)
-- Run this in Supabase SQL Editor

-- ========================================
-- Step 1: Remove unique constraint on email
-- ========================================

-- First, drop the existing unique constraint on email
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_email_key;

-- ========================================
-- Step 2: Add unique constraint on (email, role) combination
-- ========================================

-- This allows same email to have different roles
-- Example: user@example.com as 'user' and user@example.com as 'merchant'
CREATE UNIQUE INDEX IF NOT EXISTS users_email_role_unique 
ON users(email, role);

-- ========================================
-- Step 3: Add domain tracking (optional, for analytics)
-- ========================================

-- Add column to track which domain the user registered from
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS registration_domain TEXT,
ADD COLUMN IF NOT EXISTS last_login_domain TEXT;

-- ========================================
-- Step 4: Update indexes for performance
-- ========================================

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on email+role combination for faster login
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

-- ========================================
-- Step 5: Add helpful comments
-- ========================================

COMMENT ON COLUMN users.email IS 'Email address (not unique alone, but unique with role)';
COMMENT ON COLUMN users.role IS 'User role: user, merchant, or admin';
COMMENT ON COLUMN users.registration_domain IS 'Domain where user registered (e.g., app.partytix.com, merchant.partytix.com)';
COMMENT ON COLUMN users.last_login_domain IS 'Domain where user last logged in';

-- ========================================
-- Verification queries
-- ========================================

-- Test: Check if same email can exist with different roles
-- This should return true if migration is successful
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'users_email_role_unique'
    ) THEN 'Migration successful: Unique constraint on (email, role) exists'
    ELSE 'Migration failed: Unique constraint not found'
  END AS migration_status;

