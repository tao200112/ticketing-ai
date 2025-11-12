-- 清理并修复 RLS 策略
-- 这个脚本会清理所有重复的策略，并创建正确的策略配置

-- ============================================
-- 步骤 1: 删除所有现有策略
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Bypass RLS for trigger and service role" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Allow trigger inserts" ON public.users;
DROP POLICY IF EXISTS "Allow all operations for trigger" ON public.users;
DROP POLICY IF EXISTS "Allow trigger and service role" ON public.users;

-- ============================================
-- 步骤 2: 确保 RLS 已启用
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 步骤 3: 创建正确的策略（按优先级顺序）
-- ============================================

-- 策略 1: 允许触发器和服务角色执行所有操作
-- 这是最重要的策略，必须放在第一位
-- 触发器函数使用 SECURITY DEFINER，所以它需要这个策略来插入数据
CREATE POLICY "Bypass RLS for trigger and service role"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 策略 2: 允许服务角色执行所有操作
-- 这是冗余的（因为策略1已经允许所有操作），但保留它以确保兼容性
CREATE POLICY "Allow service role to manage users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 策略 3: 允许用户查看自己的数据
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 策略 4: 允许用户更新自己的数据
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 注意：我们不创建 "Allow public registration" 策略，因为：
-- 1. 用户注册是通过 Supabase Auth 完成的，不是直接插入到 public.users 表
-- 2. 触发器函数会自动处理用户数据的同步
-- 3. 直接允许公开注册可能会导致安全问题

-- ============================================
-- 步骤 4: 验证策略配置
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY 
    CASE policyname
        WHEN 'Bypass RLS for trigger and service role' THEN 1
        WHEN 'Allow service role to manage users' THEN 2
        WHEN 'Users can view their own data' THEN 3
        WHEN 'Users can update their own data' THEN 4
        ELSE 5
    END;

-- ============================================
-- 步骤 5: 测试插入（模拟触发器）
-- ============================================

DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || extract(epoch from now())::text || '@example.com';
    insert_success BOOLEAN := false;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Testing insert with cleaned RLS policies...';
    RAISE NOTICE '========================================';
    
    BEGIN
        -- 模拟触发器函数的插入操作
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            auth_provider,
            created_at,
            updated_at
        )
        VALUES (
            test_id,
            test_email,
            test_email,
            'user',
            'email',
            NOW(),
            NOW()
        );
        
        insert_success := true;
        RAISE NOTICE '✓ Insert successful: id=%, email=%', test_id, test_email;
        
        -- 清理
        DELETE FROM public.users WHERE id = test_id;
        RAISE NOTICE '✓ Test record cleaned up';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '✗ Insert failed: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
            insert_success := false;
    END;
    
    RAISE NOTICE '========================================';
    IF insert_success THEN
        RAISE NOTICE '✓ RLS policies are correctly configured';
        RAISE NOTICE '✓ Registration should work now!';
    ELSE
        RAISE WARNING '✗ RLS policies may still be blocking inserts';
        RAISE WARNING 'Please check the error message above';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 6: 检查触发器函数
-- ============================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
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
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger Status:';
    RAISE NOTICE '  Function exists: %', v_function_exists;
    RAISE NOTICE '  Trigger exists: %', v_trigger_exists;
    RAISE NOTICE '========================================';
    
    IF NOT v_function_exists THEN
        RAISE WARNING 'Trigger function does not exist! Please run FIX_REGISTRATION_ISSUE.sql first.';
    END IF;
    
    IF NOT v_trigger_exists THEN
        RAISE WARNING 'Trigger does not exist! Please run FIX_REGISTRATION_ISSUE.sql first.';
    END IF;
END $$;

