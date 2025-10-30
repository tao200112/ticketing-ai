-- Multi-Domain Multi-Role Support Migration (Fixed)
-- Allows same email to register as different roles (customer, merchant, admin)
-- Run this in Supabase SQL Editor

-- ========================================
-- Step 1: Remove unique constraint on email
-- ========================================

-- Find and drop the existing unique constraint on email
-- PostgreSQL/Supabase may use different constraint names
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Try common constraint names
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND contype = 'u'
        AND conname LIKE '%email%'
    LOOP
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Also try to drop the specific common name
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;

-- ========================================
-- Step 2: Add unique constraint on (email, role) combination
-- ========================================

-- This allows same email to have different roles
-- Example: user@example.com as 'user' and user@example.com as 'merchant'
-- First, drop the unique index if it exists (in case we need to recreate)
DROP INDEX IF EXISTS users_email_role_unique;

-- Create unique index on (email, role) combination
CREATE UNIQUE INDEX users_email_role_unique 
ON users(email, role);

-- ========================================
-- Step 3: Add domain tracking (optional, for analytics.email)
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

-- Note: idx_users_email_role is not needed as users_email_role_unique already serves this purpose
-- But we keep it for consistency with existing code
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

-- Test 1: Check if unique index on (email, role) exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'users_email_role_unique'
    ) THEN '✅ Migration successful: Unique index on (email, role) exists'
    ELSE '❌ Migration failed: Unique index not found'
  END AS migration_status;

-- Test 2: Check that email unique constraint was removed
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%email%'
    ) THEN '⚠️ Warning: Email unique constraint still exists'
    ELSE '✅ Email unique constraint successfully removed'
  END AS email_constraint_status;

-- Test 3: Verify index is actually unique
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'users_email_role_unique'
      AND indexdef LIKE '%UNIQUE%'
    ) THEN '✅ Unique index is correctly defined as UNIQUE'
    ELSE '❌ Unique index definition may be incorrect'
  END AS index_uniqueness_check;

