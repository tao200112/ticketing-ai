-- 调试触发器错误的脚本
-- 用于检查为什么用户注册时触发器失败

-- 1. 检查触发器函数是否存在
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_auth_user_to_users';

-- 2. 检查触发器是否存在
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created_to_users';

-- 3. 检查最近的错误日志
SELECT 
    log_time,
    message
FROM pg_logs
WHERE message LIKE '%handle_new_auth_user_to_users%'
ORDER BY log_time DESC
LIMIT 20;

-- 4. 测试触发器函数（模拟插入）
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
    v_role TEXT;
    v_name TEXT;
    v_provider TEXT;
    v_result_id UUID;
BEGIN
    -- 模拟触发器函数的逻辑
    v_role := 'user';
    v_name := test_email;
    v_provider := 'email';
    
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
            test_user_id,
            test_email,
            v_name,
            v_role,
            v_provider,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Test insert successful: id=%, email=%', test_user_id, test_email;
        
        -- 清理测试数据
        DELETE FROM public.users WHERE id = test_user_id;
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Test insert failed: state=%, message=%', SQLSTATE, SQLERRM;
    END;
END $$;

-- 5. 检查表约束
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass;

-- 6. 检查是否有冲突的约束
SELECT 
    id,
    email,
    role,
    COUNT(*) as count
FROM public.users
GROUP BY id, email, role
HAVING COUNT(*) > 1;

-- 7. 检查最近的 auth.users 记录
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

-- 8. 检查 public.users 表中的记录
SELECT 
    id,
    email,
    role,
    auth_provider,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 9. 检查 RLS 策略是否阻止了插入
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
AND tablename = 'users';

-- 10. 检查表权限
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'users';

