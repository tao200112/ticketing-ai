-- Add auth_provider column to users table for OAuth support
-- This migration is idempotent and safe to run multiple times

-- Add auth_provider column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'auth_provider'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN auth_provider TEXT DEFAULT 'email' 
        CHECK (auth_provider IN ('email', 'google'));
        
        RAISE NOTICE 'Added auth_provider column to users table';
    ELSE
        RAISE NOTICE 'auth_provider column already exists in users table';
    END IF;
END $$;

-- Ensure email_verified_at exists (in case it wasn't added before)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN email_verified_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added email_verified_at column to users table';
    ELSE
        RAISE NOTICE 'email_verified_at column already exists in users table';
    END IF;
END $$;

-- Create index for auth_provider for faster queries
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have 'email' as auth_provider if null
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

SELECT 'Migration completed: auth_provider and email_verified_at columns added to users table' as status;

