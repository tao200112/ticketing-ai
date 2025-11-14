-- 验证 RLS policies 是否正确配置
-- 用于测试新账号是否能正常访问 orders 和 tickets

-- ========================================
-- 1. 检查 RLS 是否启用
-- ========================================

SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets')
ORDER BY tablename;

-- ========================================
-- 2. 检查 policies 是否存在
-- ========================================

SELECT 
  'RLS Policies' as check_type,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets')
ORDER BY tablename, policyname;

-- ========================================
-- 3. 检查 supabase_uid 字段是否存在
-- ========================================

SELECT 
  'Column Check' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'tickets')
  AND column_name = 'supabase_uid'
ORDER BY table_name;

-- ========================================
-- 4. 统计有 supabase_uid 的记录数量
-- ========================================

SELECT 
  'Data Check - Orders' as check_type,
  COUNT(*) as total_orders,
  COUNT(supabase_uid) as orders_with_supabase_uid,
  COUNT(*) - COUNT(supabase_uid) as orders_without_supabase_uid
FROM orders;

SELECT 
  'Data Check - Tickets' as check_type,
  COUNT(*) as total_tickets,
  COUNT(supabase_uid) as tickets_with_supabase_uid,
  COUNT(*) - COUNT(supabase_uid) as tickets_without_supabase_uid
FROM tickets;

-- ========================================
-- 5. 测试查询（使用 Service Role，绕过 RLS）
-- ========================================
-- 注意：这个查询需要 Service Role 权限
-- 替换 'YOUR_TEST_UID' 为实际的新账号 UID

-- 示例：查询特定用户的订单
-- SELECT * FROM orders
-- WHERE supabase_uid = 'YOUR_TEST_UID';

-- 示例：查询特定用户的票据
-- SELECT * FROM tickets
-- WHERE supabase_uid = 'YOUR_TEST_UID';

-- ========================================
-- 6. 获取新账号的 Supabase UID
-- ========================================
-- 替换 'new_user@example.com' 为实际的新账号邮箱

SELECT 
  'New User UID' as check_type,
  id as supabase_uid,
  email,
  created_at
FROM auth.users
WHERE email = 'new_user@example.com'
LIMIT 1;

-- ========================================
-- 使用说明：
-- 1. 在 Supabase SQL Editor 中执行此文件
-- 2. 查看输出结果，确认：
--    - RLS 已启用
--    - Policies 已创建
--    - supabase_uid 字段存在
--    - 数据中有 supabase_uid 值
-- 3. 使用获取到的 UID 测试查询
-- ========================================

