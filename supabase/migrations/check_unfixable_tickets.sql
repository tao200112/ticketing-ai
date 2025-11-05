-- Check Unfixable Tickets
-- This script checks tickets that cannot be fixed from users or orders table

-- ========================================
-- 1. Check tickets without holder info and their order details
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name,
  t.holder_age,
  t.order_id,
  t.user_id,
  o.customer_email,
  o.customer_name as order_customer_name,
  o.customer_age as order_customer_age,
  o.created_at as order_created_at,
  u.name as user_name,
  u.age as user_age,
  t.created_at as ticket_created_at
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN users u ON t.user_id = u.id
WHERE (t.holder_name IS NULL OR t.holder_name = '')
   OR t.holder_age IS NULL
ORDER BY t.created_at DESC;

-- ========================================
-- 2. Check if orders have metadata that might contain customer info
-- ========================================

SELECT 
  o.id as order_id,
  o.customer_email,
  o.customer_name,
  o.customer_age,
  o.created_at,
  COUNT(t.id) as ticket_count
FROM orders o
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.customer_name IS NULL OR o.customer_name = ''
GROUP BY o.id, o.customer_email, o.customer_name, o.customer_age, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 3. Try to find users by email from orders
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name,
  t.holder_age,
  o.customer_email,
  u.id as user_id_from_email,
  u.name as user_name_from_email,
  u.age as user_age_from_email
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
LEFT JOIN users u ON u.email = o.customer_email
WHERE (t.holder_name IS NULL OR t.holder_name = '')
  AND o.customer_email IS NOT NULL
  AND u.id IS NOT NULL
LIMIT 10;
