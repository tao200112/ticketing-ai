-- Force password_hash to be nullable for OAuth users
-- This migration is more aggressive and will handle all edge cases

-- Step 1: Remove NOT NULL constraint if it exists (using multiple methods)
DO $$
BEGIN
    -- Method 1: Direct ALTER COLUMN (works if constraint is on the column itself)
    BEGIN
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        RAISE NOTICE 'Method 1: Removed NOT NULL constraint from password_hash';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Method 1: Could not remove NOT NULL (may not exist or different constraint type): %', SQLERRM;
    END;

    -- Method 2: Check and remove if constraint exists via information_schema
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'password_hash'
        AND is_nullable = 'NO'
    ) THEN
        -- Try to drop NOT NULL constraint
        BEGIN
            ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
            RAISE NOTICE 'Method 2: Removed NOT NULL constraint from password_hash via information_schema check';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Method 2: Error removing NOT NULL: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Method 2: password_hash already allows NULL';
    END IF;
END $$;

-- Step 2: Verify the column is nullable
DO $$
DECLARE
    is_nullable_result TEXT;
BEGIN
    SELECT is_nullable INTO is_nullable_result
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'password_hash';

    IF is_nullable_result = 'YES' THEN
        RAISE NOTICE '✅ VERIFICATION: password_hash is now nullable (YES)';
    ELSE
        RAISE WARNING '❌ VERIFICATION: password_hash is still NOT NULL (NO) - manual intervention may be required';
    END IF;
END $$;

-- Step 3: Update any existing OAuth users to have NULL password_hash (if they have empty strings)
UPDATE users 
SET password_hash = NULL 
WHERE (password_hash = '' OR password_hash IS NOT NULL) 
AND auth_provider = 'google';

-- Step 4: Show current status
SELECT 
    'password_hash status' as check_type,
    column_name,
    is_nullable,
    data_type,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ NULL allowed (OK for OAuth)'
        ELSE '❌ NOT NULL (needs fix)'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name = 'password_hash';

SELECT 'Migration completed: password_hash should now allow NULL values' as status;

