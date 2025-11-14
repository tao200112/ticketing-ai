-- 修复 supabase_uid 为 null 的订单
-- 通过邮箱匹配或关联的票务更新订单的 supabase_uid

-- ========================================
-- 1. 查看需要修复的订单数量
-- ========================================

SELECT 
  'Orders with null supabase_uid' as check_type,
  COUNT(*) as count
FROM orders
WHERE supabase_uid IS NULL;

-- ========================================
-- 2. 方法 1: 通过 customer_email 匹配 auth.users
-- ========================================

UPDATE orders o
SET supabase_uid = au.id
FROM auth.users au
WHERE o.customer_email = au.email
  AND o.supabase_uid IS NULL
  AND au.id IS NOT NULL;

-- ========================================
-- 3. 方法 2: 通过关联的票务更新（如果方法1没有匹配到）
-- ========================================

UPDATE orders o
SET supabase_uid = t.supabase_uid
FROM tickets t
WHERE t.order_id = o.id
  AND o.supabase_uid IS NULL
  AND t.supabase_uid IS NOT NULL;

-- ========================================
-- 4. 验证修复结果
-- ========================================

SELECT 
  'After fix - Orders with null supabase_uid' as check_type,
  COUNT(*) as count
FROM orders
WHERE supabase_uid IS NULL;

-- ========================================
-- 5. 查看修复后的订单示例
-- ========================================

SELECT 
  id,
  stripe_session_id,
  customer_email,
  supabase_uid,
  created_at
FROM orders
WHERE supabase_uid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 说明：
-- 1. 优先通过 customer_email 匹配 auth.users
-- 2. 如果匹配不到，则通过关联的票务更新
-- 3. 只更新 supabase_uid 为 null 的订单
-- ========================================

