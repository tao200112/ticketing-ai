-- ========================================
-- 检查 merchants 表的依赖关系
-- ========================================
-- 此脚本用于检查所有依赖于 merchants 表的 owner_supabase_uid 和 owner_user_id 列的对象
-- 在运行迁移之前，先执行此脚本查看所有依赖

-- 1. 检查所有依赖于 owner_supabase_uid 的 RLS 策略
-- ========================================
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
WHERE qual::text LIKE '%owner_supabase_uid%'
   OR with_check::text LIKE '%owner_supabase_uid%'
ORDER BY tablename, policyname;

-- 2. 检查所有依赖于 owner_user_id 的 RLS 策略
-- ========================================
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
WHERE qual::text LIKE '%owner_user_id%'
   OR with_check::text LIKE '%owner_user_id%'
ORDER BY tablename, policyname;

-- 3. 检查所有依赖于 merchants 表的外键约束
-- ========================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (ccu.table_name = 'merchants' 
         OR tc.table_name = 'merchants')
ORDER BY tc.table_name, tc.constraint_name;

-- 4. 检查 merchants 表的所有索引
-- ========================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'merchants'
ORDER BY indexname;

-- 5. 检查 merchants 表的所有列
-- ========================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'merchants'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 检查是否有触发器依赖于这些列
-- ========================================
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'merchants'
    AND (action_statement LIKE '%owner_supabase_uid%'
         OR action_statement LIKE '%owner_user_id%')
ORDER BY trigger_name;

-- 7. 检查是否有视图依赖于这些列
-- ========================================
SELECT
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
    AND (view_definition LIKE '%owner_supabase_uid%'
         OR view_definition LIKE '%owner_user_id%')
ORDER BY table_name;

