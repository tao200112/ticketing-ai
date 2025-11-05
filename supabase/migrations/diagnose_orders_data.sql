-- Diagnose Orders Data
-- This script checks the source data in orders table

-- ========================================
-- 1. Check orders with missing customer_name
-- ========================================

SELECT 
  'Orders without customer_name' as check_type,
  COUNT(*) as count
FROM orders
WHERE customer_name IS NULL OR customer_name = '';

-- ========================================
-- 2. Check orders with missing customer_age
-- ========================================

SELECT 
  'Orders without customer_age' as check_type,
  COUNT(*) as count
FROM orders
WHERE customer_age IS NULL;

-- ========================================
-- 3. Sample orders data
-- ========================================

SELECT 
  o.id as order_id,
  o.stripe_session_id,
  o.customer_email,
  o.customer_name,
  o.customer_age,
  o.created_at,
  COUNT(t.id) as ticket_count
FROM orders o
LEFT JOIN tickets t ON t.order_id = o.id
GROUP BY o.id, o.stripe_session_id, o.customer_email, o.customer_name, o.customer_age, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- ========================================
-- 4. Check tickets and their orders
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name as ticket_holder_name,
  t.holder_age as ticket_holder_age,
  t.order_id,
  o.customer_name as order_customer_name,
  o.customer_age as order_customer_age,
  o.customer_email,
  t.user_id,
  u.name as user_name,
  u.age as user_age
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;

-- ========================================
-- 5. Try to update from users table (for tickets with user_id but no holder_name)
-- ========================================

-- Check tickets that can be updated from users table
SELECT 
  t.id as ticket_id,
  t.short_id,
  t.user_id,
  u.name as user_name,
  u.age as user_age,
  t.holder_name as current_holder_name,
  t.holder_age as current_holder_age
FROM tickets t
INNER JOIN users u ON t.user_id = u.id
WHERE (t.holder_name IS NULL OR t.holder_name = '')
  AND u.name IS NOT NULL
  AND u.name != ''
LIMIT 10;
