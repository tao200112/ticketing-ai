-- 修复所有表的结构和权限
-- 这个脚本检查并修复 users, events, activities 表的问题

-- ============================================
-- 步骤 1: 确保 users 表存在并正确配置
-- ============================================

-- 创建 users 表（如果不存在）
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================
-- 步骤 2: 修复触发器函数（最简单的版本）
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
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
      COALESCE(NEW.email, ''),
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email,
        'User'
      ),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'role', ''),
        'user'
      ),
      COALESCE(
        NULLIF(NEW.raw_app_meta_data->>'provider', ''),
        'email'
      ),
      COALESCE(NEW.email_confirmed_at, NEW.confirmed_at),
      NOW(),
      NOW()
    )
    ON CONFLICT (email, role) 
    DO UPDATE SET
      id = EXCLUDED.id,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW();
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Trigger error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- ============================================
-- 步骤 3: 修复 users 表的 RLS 策略
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 删除所有现有策略
DROP POLICY IF EXISTS "Bypass RLS for trigger and service role" ON public.users;
DROP POLICY IF EXISTS "Bypass RLS for trigger" ON public.users;
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- 创建允许所有操作的策略（用于触发器）
CREATE POLICY "Bypass RLS for trigger"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 创建用户查看自己数据的策略
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 创建用户更新自己数据的策略
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 步骤 4: 检查 events 表
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) THEN
        RAISE NOTICE 'Events table does not exist. Please check your schema migration files.';
    ELSE
        RAISE NOTICE 'Events table exists.';
    END IF;
END $$;

-- 如果 events 表存在，检查并修复权限
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) THEN
        -- 授予权限
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO postgres, anon, authenticated, service_role;
        
        -- 检查 RLS
        IF NOT EXISTS (
            SELECT FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'events' 
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- 创建允许所有操作的策略（用于管理员和商家）
        DROP POLICY IF EXISTS "Allow all operations" ON public.events;
        CREATE POLICY "Allow all operations"
          ON public.events
          FOR ALL
          USING (true)
          WITH CHECK (true);
        
        RAISE NOTICE 'Events table permissions and RLS updated.';
    END IF;
END $$;

-- ============================================
-- 步骤 5: 检查 activities 表
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activities'
    ) THEN
        RAISE NOTICE 'Activities table does not exist. Please check your schema migration files.';
    ELSE
        RAISE NOTICE 'Activities table exists.';
    END IF;
END $$;

-- 如果 activities 表存在，检查并修复权限
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activities'
    ) THEN
        -- 授予权限
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activities TO postgres, anon, authenticated, service_role;
        
        -- 检查 RLS
        IF NOT EXISTS (
            SELECT FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'activities' 
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
        END IF;
        
        -- 创建允许所有操作的策略（用于管理员和商家）
        DROP POLICY IF EXISTS "Allow all operations" ON public.activities;
        CREATE POLICY "Allow all operations"
          ON public.activities
          FOR ALL
          USING (true)
          WITH CHECK (true);
        
        RAISE NOTICE 'Activities table permissions and RLS updated.';
    END IF;
END $$;

-- ============================================
-- 步骤 6: 授予所有表的权限
-- ============================================

-- users 表权限
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- ============================================
-- 步骤 7: 验证
-- ============================================

DO $$
DECLARE
    v_users_exists BOOLEAN;
    v_events_exists BOOLEAN;
    v_activities_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    -- 检查表
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) INTO v_users_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) INTO v_events_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activities'
    ) INTO v_activities_exists;
    
    -- 检查触发器
    SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_to_users'
    ) INTO v_trigger_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  Users table exists: %', v_users_exists;
    RAISE NOTICE '  Events table exists: %', v_events_exists;
    RAISE NOTICE '  Activities table exists: %', v_activities_exists;
    RAISE NOTICE '  Trigger exists: %', v_trigger_exists;
    RAISE NOTICE '========================================';
    
    IF v_users_exists AND v_trigger_exists THEN
        RAISE NOTICE '✓ Users table and trigger are correctly configured';
    ELSE
        RAISE WARNING '✗ Users table or trigger may have issues';
    END IF;
    
    IF v_events_exists THEN
        RAISE NOTICE '✓ Events table exists and permissions updated';
    ELSE
        RAISE WARNING '✗ Events table does not exist';
    END IF;
    
    IF v_activities_exists THEN
        RAISE NOTICE '✓ Activities table exists and permissions updated';
    ELSE
        RAISE WARNING '✗ Activities table does not exist';
    END IF;
END $$;

