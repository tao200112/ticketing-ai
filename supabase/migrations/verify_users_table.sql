-- 验证 users 表和触发器是否正常工作

-- 1. 检查 users 表是否存在
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        ) THEN '✓ users 表存在'
        ELSE '✗ users 表不存在'
    END as table_status;

-- 2. 检查表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. 检查触发器是否存在
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_trigger 
            WHERE tgname = 'on_auth_user_created_to_users'
        ) THEN '✓ 触发器存在'
        ELSE '✗ 触发器不存在'
    END as trigger_status;

-- 4. 检查触发器函数是否存在
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = 'handle_new_auth_user_to_users'
        ) THEN '✓ 触发器函数存在'
        ELSE '✗ 触发器函数不存在'
    END as function_status;

-- 5. 检查 RLS 是否启用
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'users' 
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN '✓ RLS 已启用'
        ELSE '✗ RLS 未启用'
    END as rls_status;

-- 6. 检查 RLS 策略
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 7. 检查最近的用户记录
SELECT 
    id,
    email,
    name,
    role,
    auth_provider,
    email_verified_at,
    is_active,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 8. 检查 auth.users 和 public.users 的同步情况
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    pu.id as public_user_id,
    pu.email as public_email,
    pu.role as public_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

