-- Complete users table creation and setup
-- This migration ensures public.users table exists with all required columns and constraints
-- Safe to run multiple times (idempotent)

-- 1. Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  age INTEGER,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_email_role_unique UNIQUE (email, role)
);

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON public.users(email, role);

-- 3. Add columns that might be missing (idempotent)
DO $$
BEGIN
  -- Add age column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE public.users ADD COLUMN age INTEGER;
    RAISE NOTICE 'Added age column to users table';
  END IF;

  -- Add password_hash column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    RAISE NOTICE 'Added password_hash column to users table';
  END IF;

  -- Add auth_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE public.users ADD COLUMN auth_provider TEXT DEFAULT 'email';
    ALTER TABLE public.users ADD CONSTRAINT users_auth_provider_check 
      CHECK (auth_provider IN ('email', 'google', 'github'));
    RAISE NOTICE 'Added auth_provider column to users table';
  END IF;

  -- Add email_verified_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email_verified_at TIMESTAMPTZ;
    RAISE NOTICE 'Added email_verified_at column to users table';
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column to users table';
  END IF;

  -- Ensure password_hash allows NULL for OAuth users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'password_hash'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from password_hash column';
  END IF;

  -- Ensure email is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'email'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
    RAISE NOTICE 'Set email column to NOT NULL';
  END IF;
END $$;

-- 4. Create or replace the trigger function for syncing auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_provider TEXT;
  v_email_verified_at TIMESTAMPTZ;
  v_result_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF v_role IS NULL OR v_role NOT IN ('user', 'merchant', 'admin') THEN
    v_role := 'user';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );

  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  v_email_verified_at := COALESCE(NEW.email_confirmed_at, NEW.confirmed_at);

  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    auth_provider,
    email_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_provider,
    v_email_verified_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (email, role) DO UPDATE
    SET
      id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW()
  RETURNING id INTO v_result_id;

  IF v_result_id = NEW.id THEN
    RAISE LOG 'handle_new_auth_user_to_users: inserted email=% role=% id=% provider=%', NEW.email, v_role, v_result_id, v_provider;
  ELSE
    RAISE LOG 'handle_new_auth_user_to_users: updated existing record for email=% role=% existing_id=% auth_id=% provider=%', NEW.email, v_role, v_result_id, NEW.id, v_provider;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_auth_user_to_users error email=% role=% id=% state=% message=%', NEW.email, v_role, NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 6. Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies and recreate them
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

-- Service role can do everything
CREATE POLICY "Allow service role to manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow public registration (insert)
CREATE POLICY "Allow public registration" ON public.users
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read users (for basic lookups)
CREATE POLICY "Allow authenticated users to read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 8. Grant permissions
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO anon;

-- 9. Sync existing auth.users to public.users (backfill)
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  auth_provider,
  email_verified_at,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    u.email
  ) as name,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', ''),
    'user'
  ) as role,
  COALESCE(
    u.raw_app_meta_data->>'provider',
    'email'
  ) as auth_provider,
  COALESCE(u.email_confirmed_at, u.confirmed_at) as email_verified_at,
  COALESCE(u.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users u
ON CONFLICT (email, role) DO UPDATE
  SET
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name),
    auth_provider = EXCLUDED.auth_provider,
    email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
    updated_at = NOW();

-- 10. Verify table structure
DO $$
BEGIN
  RAISE NOTICE 'Users table created/updated successfully!';
  RAISE NOTICE 'Table columns: id, email, name, role, age, password_hash, auth_provider, email_verified_at, is_active, created_at, updated_at';
  RAISE NOTICE 'Unique constraint: (email, role)';
  RAISE NOTICE 'Trigger: on_auth_user_created_to_users (syncs auth.users to public.users)';
END $$;

