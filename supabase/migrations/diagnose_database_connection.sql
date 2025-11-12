-- 诊断数据库连接和表结构问题
-- 这个脚本检查数据库连接、表结构、触发器等

-- ============================================
-- 步骤 1: 检查 users 表结构
-- ============================================

SELECT 
    'Users Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 步骤 2: 检查 users 表约束
-- ============================================

SELECT 
    'Users Table Constraints' as check_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- ============================================
-- 步骤 3: 检查触发器函数
-- ============================================

SELECT 
    'Trigger Function' as check_type,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_auth_user_to_users';

-- ============================================
-- 步骤 4: 检查触发器
-- ============================================

SELECT 
    'Trigger' as check_type,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition,
    t.tgenabled as enabled
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created_to_users';

-- ============================================
-- 步骤 5: 检查 RLS 策略
-- ============================================

SELECT 
    'RLS Policies' as check_type,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- ============================================
-- 步骤 6: 测试触发器函数（模拟调用）
-- ============================================

DO $$
DECLARE
    test_auth_user RECORD;
    test_result TEXT;
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Testing Trigger Function';
    RAISE NOTICE '========================================';
    
    -- 检查函数是否存在
    SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'handle_new_auth_user_to_users'
    ) INTO function_exists;
    
    IF NOT function_exists THEN
        RAISE WARNING 'Trigger function does not exist!';
        RETURN;
    END IF;
    
    -- 创建一个模拟的 NEW 记录
    -- 注意：我们不能直接调用触发器函数，但可以测试插入
    
    RAISE NOTICE 'Trigger function exists: %', function_exists;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 7: 测试直接插入（绕过触发器）
-- ============================================

DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_direct_' || extract(epoch from now())::text || '@example.com';
    insert_success BOOLEAN := false;
    error_message TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test: Direct INSERT (bypassing trigger)';
    RAISE NOTICE '========================================';
    
    -- 临时禁用触发器
    ALTER TABLE public.users DISABLE TRIGGER on_auth_user_created_to_users;
    
    BEGIN
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
        RAISE NOTICE '✓ Direct INSERT successful';
        
        -- 清理
        DELETE FROM public.users WHERE id = test_id;
        RAISE NOTICE '✓ Test record cleaned up';
        
    EXCEPTION
        WHEN others THEN
            error_message := SQLERRM;
            RAISE NOTICE '✗ Direct INSERT failed';
            RAISE NOTICE '  SQLSTATE: %', SQLSTATE;
            RAISE NOTICE '  Error: %', error_message;
            insert_success := false;
    END;
    
    -- 重新启用触发器
    ALTER TABLE public.users ENABLE TRIGGER on_auth_user_created_to_users;
    
    RAISE NOTICE '========================================';
    IF insert_success THEN
        RAISE NOTICE '✓ Table structure is correct';
        RAISE NOTICE '✓ Problem is likely in trigger function or RLS';
    ELSE
        RAISE WARNING '✗ Table structure may have issues';
        RAISE WARNING 'Check constraints and column definitions';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 8: 检查 events 表
-- ============================================

SELECT 
    'Events Table' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'events'
        ) THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as table_status;

-- 如果 events 表存在，检查结构
SELECT 
    'Events Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position
LIMIT 10;

-- ============================================
-- 步骤 9: 检查 activities 表
-- ============================================

SELECT 
    'Activities Table' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'activities'
        ) THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as table_status;

-- 如果 activities 表存在，检查结构
SELECT 
    'Activities Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'activities'
ORDER BY ordinal_position
LIMIT 10;

-- ============================================
-- 步骤 10: 检查数据库连接
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Connection Test';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current database: %', current_database();
    RAISE NOTICE 'Current user: %', current_user;
    RAISE NOTICE 'Current schema: %', current_schema();
    RAISE NOTICE 'Server version: %', version();
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 步骤 11: 检查最近的错误日志
-- ============================================

-- 检查是否有最近的插入失败
SELECT 
    'Recent Users' as check_type,
    id,
    email,
    role,
    created_at,
    auth_provider
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 检查 auth.users 中是否有新用户
SELECT 
    'Recent Auth Users' as check_type,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 步骤 12: 检查表权限
-- ============================================

SELECT 
    'Table Permissions' as check_type,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY grantee, privilege_type;

