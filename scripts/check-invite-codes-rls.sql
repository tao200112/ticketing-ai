-- ========================================
-- 检查 admin_invite_codes 表的 RLS 策略
-- ========================================

-- 1. 检查表是否存在
SELECT 
    '=== 表是否存在 ===' AS section;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_invite_codes'
) AS admin_invite_codes_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invite_codes'
) AS invite_codes_exists;

-- 2. 检查 RLS 是否启用
SELECT 
    '=== RLS 状态 ===' AS section;

SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('admin_invite_codes', 'invite_codes')
ORDER BY tablename;

-- 3. 检查所有 RLS 策略
SELECT 
    '=== RLS 策略 ===' AS section;

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
WHERE tablename IN ('admin_invite_codes', 'invite_codes')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. 测试查询（需要手动执行，使用 service role key）
-- SELECT * FROM admin_invite_codes LIMIT 1;

