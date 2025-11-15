-- ========================================
-- 简化的商家表审计脚本（分步执行）
-- ========================================
-- 如果完整版本报错，请逐个运行这些查询

-- ========================================
-- 查询 1: Merchants 表结构
-- ========================================
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
-- 查询 2: Merchants 表的所有约束
-- ========================================
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
-- 查询 3: Merchants 表的所有索引
-- ========================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'merchants'
    AND schemaname = 'public'
ORDER BY indexname;

-- ========================================
-- 查询 4: 依赖 owner_supabase_uid 的 RLS 策略
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE qual::text LIKE '%owner_supabase_uid%'
   OR with_check::text LIKE '%owner_supabase_uid%'
ORDER BY tablename, policyname;

-- ========================================
-- 查询 5: 依赖 owner_user_id 的 RLS 策略
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE qual::text LIKE '%owner_user_id%'
   OR with_check::text LIKE '%owner_user_id%'
ORDER BY tablename, policyname;

-- ========================================
-- 查询 6: Merchants 表的所有 RLS 策略
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS with_check_clause
FROM pg_policies
WHERE tablename = 'merchants'
    AND schemaname = 'public'
ORDER BY policyname;

-- ========================================
-- 查询 7: 其他表依赖 merchants 的外键
-- ========================================
SELECT
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    tc.constraint_name
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
-- 查询 8: Merchants 表数据统计
-- ========================================
SELECT 
    COUNT(*) AS total_merchants,
    COUNT(owner_supabase_uid) AS has_owner_supabase_uid,
    COUNT(owner_user_id) AS has_owner_user_id,
    COUNT(contact_email) AS has_contact_email,
    COUNT(CASE WHEN contact_email IS NOT NULL AND owner_supabase_uid IS NULL AND owner_user_id IS NULL THEN 1 END) AS orphaned_merchants
FROM merchants;

-- ========================================
-- 查询 9: 示例数据（前5条）
-- ========================================
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

