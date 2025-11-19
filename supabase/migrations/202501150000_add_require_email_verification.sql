-- Add require_email_verification field to users and merchant_members tables
-- This migration is part of the unified auth refactor

-- ========================================
-- Step 1: Add require_email_verification to public.users
-- ========================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.users.require_email_verification IS 
'Whether this user requires email verification. Always false for new unified auth system.';

-- ========================================
-- Step 2: Add require_email_verification to merchant_members
-- ========================================
ALTER TABLE merchant_members 
ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN merchant_members.require_email_verification IS 
'Whether this merchant member requires email verification. Always false for new unified auth system.';

-- ========================================
-- Step 3: Update existing records to false (backward compatibility)
-- ========================================
UPDATE public.users 
SET require_email_verification = false 
WHERE require_email_verification IS NULL;

UPDATE merchant_members 
SET require_email_verification = false 
WHERE require_email_verification IS NULL;

