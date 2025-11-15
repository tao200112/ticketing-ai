-- ========================================
-- 全面的商家表审计脚本
-- ========================================
-- 此脚本收集所有相关信息，用于安全迁移
-- 运行此脚本后，将所有结果保存，然后根据结果创建迁移脚本

-- ========================================
-- 1. Merchants 表当前结构
-- ========================================
SELECT 
    '=== Merchants 表结构 ===' AS section;

SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'merchants'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. Merchants 表的所有约束
-- ========================================
SELECT 
    '=== Merchants 表约束 ===' AS section;

SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'merchants'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ========================================
-- 3. Merchants 表的所有索引
-- ========================================
SELECT 
    '=== Merchants 表索引 ===' AS section;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'merchants'
    AND schemaname = 'public'
ORDER BY indexname;

-- ========================================
-- 4. 所有依赖 owner_supabase_uid 的 RLS 策略
-- ========================================
SELECT 
    '=== 依赖 owner_supabase_uid 的策略 ===' AS section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text AS roles,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE qual::text LIKE '%owner_supabase_uid%'
   OR with_check::text LIKE '%owner_supabase_uid%'
ORDER BY tablename, policyname;

-- ========================================
-- 5. 所有依赖 owner_user_id 的 RLS 策略
-- ========================================
SELECT 
    '=== 依赖 owner_user_id 的策略 ===' AS section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text AS roles,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE qual::text LIKE '%owner_user_id%'
   OR with_check::text LIKE '%owner_user_id%'
ORDER BY tablename, policyname;

-- ========================================
-- 6. Merchants 表的所有 RLS 策略（完整列表）
-- ========================================
SELECT 
    '=== Merchants 表所有 RLS 策略 ===' AS section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text AS roles,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE tablename = 'merchants'
    AND schemaname = 'public'
ORDER BY policyname;

-- ========================================
-- 7. 其他表依赖 merchants 的外键
-- ========================================
SELECT 
    '=== 其他表依赖 merchants 的外键 ===' AS section;

SELECT
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'merchants'
ORDER BY tc.table_name, tc.constraint_name;

-- ========================================
-- 8. Merchants 表的触发器
-- ========================================
SELECT 
    '=== Merchants 表触发器 ===' AS section;

SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'merchants'
    AND event_object_schema = 'public'
ORDER BY trigger_name;

-- ========================================
-- 9. 依赖 merchants 表的视图
-- ========================================
SELECT 
    '=== 依赖 merchants 表的视图 ===' AS section;

SELECT
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
    AND (view_definition LIKE '%merchants%'
         OR view_definition LIKE '%owner_supabase_uid%'
         OR view_definition LIKE '%owner_user_id%')
ORDER BY table_name;

-- ========================================
-- 10. Merchants 表的当前数据统计
-- ========================================
SELECT 
    '=== Merchants 表数据统计 ===' AS section;

SELECT 
    COUNT(*) AS total_merchants,
    COUNT(owner_supabase_uid) AS has_owner_supabase_uid,
    COUNT(owner_user_id) AS has_owner_user_id,
    COUNT(contact_email) AS has_contact_email,
    COUNT(CASE WHEN contact_email IS NOT NULL AND owner_supabase_uid IS NULL AND owner_user_id IS NULL THEN 1 END) AS orphaned_merchants
FROM merchants;

-- ========================================
-- 11. 示例数据（前5条，用于验证迁移）
-- ========================================
SELECT 
    '=== Merchants 表示例数据（前5条） ===' AS section;

SELECT 
    id,
    name,
    owner_supabase_uid,
    owner_user_id,
    contact_email,
    contact_phone,
    status,
    verified,
    created_at
FROM merchants
ORDER BY created_at
LIMIT 5;

-- ========================================
-- 12. 检查是否有函数依赖这些列
-- ========================================
SELECT 
    '=== 依赖这些列的函数 ===' AS section;

SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (pg_get_functiondef(p.oid) LIKE '%owner_supabase_uid%'
         OR pg_get_functiondef(p.oid) LIKE '%owner_user_id%')
ORDER BY p.proname;

