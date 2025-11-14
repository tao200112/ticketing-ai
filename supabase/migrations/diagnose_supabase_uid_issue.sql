-- 诊断 supabase_uid 为 null 的问题
-- 用于排查为什么新票的 supabase_uid 为 null

-- ========================================
-- 1. 查看最新的票务
-- ========================================

SELECT 
  'Latest Tickets' as check_type,
  id,
  short_id,
  holder_email,
  supabase_uid,
  user_id,
  created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 2. 查看对应的订单
-- ========================================

SELECT 
  'Latest Orders' as check_type,
  id,
  stripe_session_id,
  customer_email,
  supabase_uid,
  user_id,
  metadata->>'supabase_uid' as metadata_supabase_uid,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 3. 检查订单和票务的关联
-- ========================================

SELECT 
  'Order-Ticket Relationship' as check_type,
  o.id as order_id,
  o.stripe_session_id,
  o.customer_email as order_email,
  o.supabase_uid as order_supabase_uid,
  t.id as ticket_id,
  t.short_id,
  t.holder_email as ticket_email,
  t.supabase_uid as ticket_supabase_uid,
  t.created_at as ticket_created_at
FROM orders o
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.created_at > NOW() - INTERVAL '24 hours'
ORDER BY o.created_at DESC, t.created_at DESC
LIMIT 20;

-- ========================================
-- 4. 检查 auth.users 中的用户
-- ========================================

SELECT 
  'Auth Users' as check_type,
  id as supabase_uid,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 5. 统计信息
-- ========================================

SELECT 
  'Statistics' as check_type,
  (SELECT COUNT(*) FROM tickets WHERE supabase_uid IS NULL) as tickets_without_uid,
  (SELECT COUNT(*) FROM tickets WHERE supabase_uid IS NOT NULL) as tickets_with_uid,
  (SELECT COUNT(*) FROM orders WHERE supabase_uid IS NULL) as orders_without_uid,
  (SELECT COUNT(*) FROM orders WHERE supabase_uid IS NOT NULL) as orders_with_uid,
  (SELECT COUNT(*) FROM tickets WHERE created_at > NOW() - INTERVAL '24 hours' AND supabase_uid IS NULL) as recent_tickets_without_uid,
  (SELECT COUNT(*) FROM tickets WHERE created_at > NOW() - INTERVAL '24 hours' AND supabase_uid IS NOT NULL) as recent_tickets_with_uid;

-- ========================================
-- 6. 检查是否有邮箱匹配的用户
-- ========================================

-- 查看票务邮箱和 auth.users 的匹配情况
SELECT 
  'Email Matching Check' as check_type,
  t.holder_email,
  t.supabase_uid as ticket_supabase_uid,
  au.id as auth_supabase_uid,
  CASE 
    WHEN t.supabase_uid IS NULL AND au.id IS NOT NULL THEN 'Can be fixed'
    WHEN t.supabase_uid IS NULL AND au.id IS NULL THEN 'No matching user'
    WHEN t.supabase_uid = au.id THEN 'Already matched'
    ELSE 'Mismatch'
  END as status
FROM tickets t
LEFT JOIN auth.users au ON au.email = t.holder_email
WHERE t.created_at > NOW() - INTERVAL '24 hours'
  AND t.supabase_uid IS NULL
ORDER BY t.created_at DESC
LIMIT 10;

-- ========================================
-- 使用说明：
-- 1. 执行此脚本查看问题详情
-- 2. 如果看到 "Can be fixed"，可以运行 fix_null_supabase_uid_tickets.sql
-- 3. 如果看到 "No matching user"，说明用户可能没有在 auth.users 中注册
-- ========================================

