-- 检查触发器问题的诊断脚本
-- 用于找出为什么触发器会导致注册失败

-- 1. 检查触发器函数定义
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_auth_user_to_users';

-- 2. 检查触发器定义
SELECT 
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition,
    t.tgenabled as enabled
FROM pg_trigger t
WHERE t.tgname = 'on_auth_user_created_to_users';

-- 3. 检查表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. 检查约束
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- 5. 检查 RLS 状态
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'users' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. 检查 RLS 策略
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
ORDER BY policyname;

-- 7. 检查权限
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- 8. 测试插入（模拟触发器逻辑）
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || extract(epoch from now())::text || '@example.com';
    insert_success BOOLEAN := false;
BEGIN
    RAISE NOTICE 'Testing insert with id=%, email=%', test_id, test_email;
    
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
        RAISE NOTICE 'Insert successful';
        
        -- 清理
        DELETE FROM public.users WHERE id = test_id;
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Insert failed: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
            insert_success := false;
    END;
    
    IF insert_success THEN
        RAISE NOTICE 'Test passed: Insert works correctly';
    ELSE
        RAISE WARNING 'Test failed: Insert does not work';
    END IF;
END $$;

-- 9. 检查最近的 auth.users 记录（看看是否有新用户创建）
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 10. 检查 public.users 表中的记录
SELECT 
    id,
    email,
    role,
    auth_provider,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 11. 检查是否有未同步的用户
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    pu.id as public_id,
    pu.email as public_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

