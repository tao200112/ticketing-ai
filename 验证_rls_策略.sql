-- 验证 RLS 策略是否正常工作
-- 在 Supabase SQL Editor 中执行此文件来测试 RLS 策略

-- ========================================
-- 1. 检查 RLS 是否已启用
-- ========================================

-- 检查所有表的 RLS 状态
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'merchants', 'events', 'prices', 'orders', 'tickets', 'admin_invite_codes')
ORDER BY tablename;

-- ========================================
-- 2. 检查现有策略
-- ========================================

-- 查看所有表的 RLS 策略
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
ORDER BY tablename, policyname;

-- ========================================
-- 3. 测试数据访问（需要认证用户）
-- ========================================

-- 注意：以下查询需要在有认证用户的情况下执行
-- 如果没有认证用户，这些查询可能会返回空结果

-- 测试用户表访问
-- SELECT 'Users table access test' as test_name;
-- SELECT COUNT(*) as user_count FROM users;

-- 测试商家表访问
-- SELECT 'Merchants table access test' as test_name;
-- SELECT COUNT(*) as merchant_count FROM merchants;

-- 测试活动表访问
-- SELECT 'Events table access test' as test_name;
-- SELECT COUNT(*) as event_count FROM events;

-- ========================================
-- 4. 检查表结构
-- ========================================

-- 检查 merchants 表结构，确认 owner_user_id 列存在
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'merchants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查外键约束
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'merchants'
    AND tc.table_schema = 'public';

-- ========================================
-- 5. 创建测试数据（可选）
-- ========================================

-- 如果需要测试 RLS 策略，可以创建一些测试数据
-- 注意：这些操作需要适当的权限

-- 插入测试用户（如果不存在）
-- INSERT INTO users (id, email, name, age, role) 
-- VALUES (
--     'test-user-id-123'::UUID,
--     'test@example.com',
--     'Test User',
--     25,
--     'user'
-- ) ON CONFLICT (email) DO NOTHING;

-- 插入测试商家（如果不存在）
-- INSERT INTO merchants (id, owner_user_id, name, contact_email, verified) 
-- VALUES (
--     'test-merchant-id-123'::UUID,
--     'test-user-id-123'::UUID,
--     'Test Merchant',
--     'merchant@example.com',
--     true
-- ) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 6. 输出验证结果
-- ========================================

-- 输出验证完成信息
DO $$
DECLARE
    rls_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- 统计启用 RLS 的表数量
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND tablename IN ('users', 'merchants', 'events', 'prices', 'orders', 'tickets', 'admin_invite_codes')
        AND rowsecurity = true;
    
    -- 统计策略数量
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'RLS 验证完成！';
    RAISE NOTICE '启用 RLS 的表数量: %', rls_count;
    RAISE NOTICE '创建的策略数量: %', policy_count;
    
    IF rls_count >= 7 THEN
        RAISE NOTICE '✅ 所有表的 RLS 已正确启用';
    ELSE
        RAISE NOTICE '⚠️ 部分表的 RLS 可能未启用';
    END IF;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ RLS 策略已创建';
    ELSE
        RAISE NOTICE '⚠️ 未找到 RLS 策略';
    END IF;
    
    RAISE NOTICE '请检查上方的查询结果以确认 RLS 配置正确';
END $$;
