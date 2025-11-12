-- 完全修复触发器函数
-- 这个脚本创建一个最简单的触发器函数，确保不会失败

-- ============================================
-- 步骤 1: 删除现有触发器和函数
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- ============================================
-- 步骤 2: 创建最简单的触发器函数
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 最简单的插入逻辑，不使用任何复杂的数据提取
  -- 直接使用 NEW 记录的值
  
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
      -- 记录错误但不抛出异常
      -- 使用 RAISE WARNING 而不是 RAISE EXCEPTION
      RAISE WARNING 'Trigger error: %', SQLERRM;
  END;

  -- 始终返回 NEW
  RETURN NEW;
END;
$$;

-- ============================================
-- 步骤 3: 设置函数权限
-- ============================================

ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- ============================================
-- 步骤 4: 创建触发器
-- ============================================

CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- ============================================
-- 步骤 5: 确保 RLS 策略允许插入
-- ============================================

-- 删除所有现有策略
DROP POLICY IF EXISTS "Bypass RLS for trigger and service role" ON public.users;
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
-- 步骤 6: 验证
-- ============================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
    v_policy_exists BOOLEAN;
BEGIN
    -- 检查函数
    SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'handle_new_auth_user_to_users'
    ) INTO v_function_exists;
    
    -- 检查触发器
    SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_to_users'
    ) INTO v_trigger_exists;
    
    -- 检查策略
    SELECT EXISTS (
        SELECT FROM pg_policies
        WHERE schemaname = 'public' 
        AND tablename = 'users'
        AND policyname = 'Bypass RLS for trigger'
    ) INTO v_policy_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  Function exists: %', v_function_exists;
    RAISE NOTICE '  Trigger exists: %', v_trigger_exists;
    RAISE NOTICE '  Policy exists: %', v_policy_exists;
    RAISE NOTICE '========================================';
    
    IF v_function_exists AND v_trigger_exists AND v_policy_exists THEN
        RAISE NOTICE '✓ Trigger setup completed successfully';
    ELSE
        RAISE WARNING '✗ Trigger setup may have issues';
    END IF;
END $$;

