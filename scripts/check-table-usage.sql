-- ========================================
-- 检查表的使用情况
-- ========================================
-- 此脚本帮助确定哪些表正在被使用

-- 1. 检查哪些表有外键依赖
SELECT 
    '=== 表的外键依赖 ===' AS section;

SELECT
    tc.table_name AS table_name,
    COUNT(DISTINCT kcu.column_name) AS foreign_key_count
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name
ORDER BY foreign_key_count DESC, tc.table_name;

-- 2. 检查哪些表被其他表引用
SELECT 
    '=== 被其他表引用的表 ===' AS section;

SELECT
    ccu.table_name AS referenced_table,
    COUNT(DISTINCT tc.table_name) AS referencing_tables_count,
    STRING_AGG(DISTINCT tc.table_name, ', ') AS referencing_tables
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
GROUP BY ccu.table_name
ORDER BY referencing_tables_count DESC;

-- 3. 检查表的数据量
SELECT 
    '=== 表的数据量 ===' AS section;

SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 4. 列出所有表
SELECT 
    '=== 所有表列表 ===' AS section;

SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

