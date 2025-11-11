-- ========================================
-- 数据库重建验证脚本
-- 执行此脚本验证数据库重建是否成功
-- ========================================

-- 1. 检查所有表是否存在
SELECT 
    'Tables' as check_type,
    table_name as item_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
ORDER BY table_name;

-- 2. 检查 users 表约束
SELECT 
    'Users Constraints' as check_type,
    constraint_name as item_name,
    constraint_type as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY constraint_type, constraint_name;

-- 3. 检查所有索引
SELECT 
    'Indexes' as check_type,
    indexname as item_name,
    tablename as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
ORDER BY tablename, indexname;

-- 4. 检查触发器
SELECT 
    'Triggers' as check_type,
    trigger_name as item_name,
    event_object_table as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. 检查用户同步触发器
SELECT 
    'Auth Trigger' as check_type,
    trigger_name as item_name,
    event_object_table as status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- 6. 检查 RLS 是否启用
SELECT 
    'RLS Status' as check_type,
    tablename as item_name,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
ORDER BY tablename;

-- 7. 检查 RLS 策略
SELECT 
    'RLS Policies' as check_type,
    policyname as item_name,
    tablename as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. 检查视图
SELECT 
    'Views' as check_type,
    table_name as item_name,
    'EXISTS' as status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 9. 检查数据同步（auth.users 到 public.users）
SELECT 
    'Data Sync' as check_type,
    'auth.users' as item_name,
    COUNT(*)::text as status
FROM auth.users
UNION ALL
SELECT 
    'Data Sync' as check_type,
    'public.users' as item_name,
    COUNT(*)::text as status
FROM public.users;

-- 10. 检查函数
SELECT 
    'Functions' as check_type,
    routine_name as item_name,
    routine_type as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_updated_at_column',
    'update_activities_updated_at',
    'check_inventory_constraint',
    'check_event_attendees_constraint',
    'handle_new_auth_user_to_users'
)
ORDER BY routine_name;

-- 11. 汇总报告
SELECT 
    'SUMMARY' as check_type,
    'Total Tables' as item_name,
    COUNT(*)::text as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total Indexes' as item_name,
    COUNT(*)::text as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total Triggers' as item_name,
    COUNT(*)::text as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total RLS Policies' as item_name,
    COUNT(*)::text as status
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total Views' as item_name,
    COUNT(*)::text as status
FROM information_schema.views
WHERE table_schema = 'public';

