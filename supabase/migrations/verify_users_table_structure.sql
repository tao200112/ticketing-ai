-- Verify users table structure and constraints
-- Run this to check what fields exist and their constraints

-- Check all columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check constraints on users table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- Check if auth_provider column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'auth_provider'
        ) THEN 'auth_provider column EXISTS'
        ELSE 'auth_provider column DOES NOT EXIST'
    END as auth_provider_status;

-- Check if email_verified_at column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'email_verified_at'
        ) THEN 'email_verified_at column EXISTS'
        ELSE 'email_verified_at column DOES NOT EXIST'
    END as email_verified_at_status;

-- Check password_hash nullable status
SELECT 
    column_name,
    is_nullable,
    CASE 
        WHEN is_nullable = 'YES' THEN 'password_hash CAN be NULL (OK for OAuth)'
        ELSE 'password_hash CANNOT be NULL (needs migration)'
    END as password_hash_status
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'password_hash';

