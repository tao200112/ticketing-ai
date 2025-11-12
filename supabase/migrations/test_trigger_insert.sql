-- 测试触发器插入功能
-- 这个脚本测试触发器函数是否能够成功插入数据

-- ============================================
-- 步骤 1: 检查当前策略
-- ============================================

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- ============================================
-- 步骤 2: 测试直接插入（模拟触发器函数）
-- ============================================

DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_trigger_' || extract(epoch from now())::text || '@example.com';
    insert_success BOOLEAN := false;
    error_message TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test 1: Direct INSERT (simulating trigger)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test ID: %', test_id;
    RAISE NOTICE 'Test Email: %', test_email;
    
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
        RAISE NOTICE '✓ INSERT successful';
        
        -- 验证数据
        IF EXISTS (SELECT 1 FROM public.users WHERE id = test_id) THEN
            RAISE NOTICE '✓ Data verified in table';
        ELSE
            RAISE WARNING '✗ Data not found in table';
        END IF;
        
        -- 清理
        DELETE FROM public.users WHERE id = test_id;
        RAISE NOTICE '✓ Test record cleaned up';
        
    EXCEPTION
        WHEN others THEN
            error_message := SQLERRM;
            RAISE NOTICE '✗ INSERT failed';
            RAISE NOTICE '  SQLSTATE: %', SQLSTATE;
            RAISE NOTICE '  Error: %', error_message;
            insert_success := false;
    END;
    
    RAISE NOTICE '========================================';
    IF insert_success THEN
        RAISE NOTICE '✓ Test 1 PASSED: Direct INSERT works';
    ELSE
        RAISE WARNING '✗ Test 1 FAILED: Direct INSERT blocked';
        RAISE WARNING 'This indicates an RLS policy issue';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 3: 测试触发器函数调用
-- ============================================

DO $$
DECLARE
    test_auth_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test_trigger_func_' || extract(epoch from now())::text || '@example.com';
    function_result TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test 2: Trigger function execution';
    RAISE NOTICE '========================================';
    
    -- 检查函数是否存在
    IF NOT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'handle_new_auth_user_to_users'
    ) THEN
        RAISE WARNING 'Trigger function does not exist!';
        RAISE WARNING 'Please run FIX_REGISTRATION_ISSUE.sql first.';
        RETURN;
    END IF;
    
    -- 创建模拟的 auth.users 记录（如果可能）
    -- 注意：我们不能直接插入到 auth.users，但可以测试函数逻辑
    
    RAISE NOTICE 'Note: Cannot test trigger function directly without auth.users record';
    RAISE NOTICE 'Please test registration through the application instead';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 4: 检查权限和角色
-- ============================================

DO $$
DECLARE
    current_role TEXT;
    current_user_name TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current Context:';
    RAISE NOTICE '========================================';
    
    SELECT current_user INTO current_user_name;
    SELECT current_setting('role') INTO current_role;
    
    RAISE NOTICE 'Current user: %', current_user_name;
    RAISE NOTICE 'Current role: %', current_role;
    
    -- 检查 auth context
    BEGIN
        RAISE NOTICE 'auth.uid(): %', auth.uid();
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'auth.uid() is NULL (expected in SQL context)';
    END;
    
    BEGIN
        RAISE NOTICE 'auth.role(): %', auth.role();
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'auth.role() is NULL (expected in SQL context)';
    END;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 5: 验证策略优先级
-- ============================================

-- 在 PostgreSQL 中，RLS 策略使用 OR 逻辑
-- 如果任何一个策略允许操作，操作就会被允许
-- 所以我们创建的 "Bypass RLS for trigger and service role" 策略（USING (true)）应该允许所有操作

SELECT 
    'Policy Analysis' as analysis,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE cmd = 'ALL') as all_operations_policies,
    COUNT(*) FILTER (WHERE qual = 'true') as bypass_policies
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users';

