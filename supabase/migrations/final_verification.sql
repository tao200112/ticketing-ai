-- ========================================
-- 数据库重建最终验证脚本
-- 验证所有表、视图、约束、索引、触发器、RLS 策略是否正确设置
-- ========================================

-- 1. 检查所有表是否存在
SELECT 
    '✅ 表检查' as check_type,
    COUNT(*) as total_tables,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as table_list
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
);

-- 2. 检查所有视图是否存在
SELECT 
    '✅ 视图检查' as check_type,
    COUNT(*) as total_views,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as view_list
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('events_overview', 'merchant_stats');

-- 3. 检查 users 表的关键约束
SELECT 
    '✅ Users 表约束' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'users'
AND constraint_name IN (
    'users_pkey1',
    'users_id_fkey',
    'users_email_role_unique',
    'users_role_check1',
    'users_auth_provider_check1'
)
ORDER BY constraint_type, constraint_name;

-- 4. 检查索引数量
SELECT 
    '✅ 索引检查' as check_type,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
GROUP BY tablename
ORDER BY tablename;

-- 5. 检查触发器
SELECT 
    '✅ 触发器检查' as check_type,
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. 检查用户同步触发器
SELECT 
    '✅ 用户同步触发器' as check_type,
    trigger_name,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created_to_users';

-- 7. 检查 RLS 是否启用
SELECT 
    '✅ RLS 状态' as check_type,
    tablename,
    CASE WHEN rowsecurity THEN '✅ 已启用' ELSE '❌ 未启用' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
ORDER BY tablename;

-- 8. 检查 RLS 策略数量
SELECT 
    '✅ RLS 策略' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 9. 检查数据同步
SELECT 
    '✅ 数据同步' as check_type,
    'auth.users' as source_table,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    '✅ 数据同步' as check_type,
    'public.users' as source_table,
    COUNT(*) as record_count
FROM public.users;

-- 10. 检查函数
SELECT 
    '✅ 函数检查' as check_type,
    routine_name,
    routine_type
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

-- 11. 检查 users 表结构
SELECT 
    '✅ Users 表结构' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 12. 汇总报告
SELECT 
    '📊 汇总报告' as report_type,
    '表数量' as item,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
UNION ALL
SELECT 
    '📊 汇总报告' as report_type,
    '视图数量' as item,
    COUNT(*)::text as value
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('events_overview', 'merchant_stats')
UNION ALL
SELECT 
    '📊 汇总报告' as report_type,
    '索引总数' as item,
    COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
UNION ALL
SELECT 
    '📊 汇总报告' as report_type,
    '触发器总数' as item,
    COUNT(*)::text as value
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    '📊 汇总报告' as report_type,
    'RLS 策略总数' as item,
    COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
    '📊 汇总报告' as report_type,
    '函数总数' as item,
    COUNT(*)::text as value
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_updated_at_column',
    'update_activities_updated_at',
    'check_inventory_constraint',
    'check_event_attendees_constraint',
    'handle_new_auth_user_to_users'
);

-- 13. 检查是否有旧表残留
SELECT 
    '⚠️ 旧表检查' as check_type,
    table_name,
    '需要清理' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    'users', 'merchants', 'merchant_members', 'admin_invite_codes',
    'events', 'prices', 'orders', 'tickets', 'activities', 'contact_messages'
)
ORDER BY table_name;

