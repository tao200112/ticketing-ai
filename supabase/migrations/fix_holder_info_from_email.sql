-- Fix Holder Info from Email Match
-- This script updates tickets by matching orders.customer_email with users.email
-- This is useful when tickets don't have user_id but orders have customer_email

-- ========================================
-- 1. Check tickets that can be fixed via email match
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name as current_holder_name,
  t.holder_age as current_holder_age,
  o.customer_email,
  u.name as user_name_from_email,
  u.age as user_age_from_email
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
INNER JOIN users u ON u.email = o.customer_email
WHERE ((t.holder_name IS NULL OR t.holder_name = '') OR t.holder_age IS NULL)
  AND o.customer_email IS NOT NULL
  AND u.name IS NOT NULL
  AND u.name != ''
LIMIT 10;

-- ========================================
-- 2. Update holder_name from users table via email match
-- ========================================

UPDATE tickets t
SET holder_name = u.name
FROM orders o
INNER JOIN users u ON u.email = o.customer_email
WHERE t.order_id = o.id
  AND (t.holder_name IS NULL OR t.holder_name = '')
  AND o.customer_email IS NOT NULL
  AND u.name IS NOT NULL
  AND u.name != '';

-- ========================================
-- 3. Update holder_age from users table via email match
-- ========================================

UPDATE tickets t
SET holder_age = u.age
FROM orders o
INNER JOIN users u ON u.email = o.customer_email
WHERE t.order_id = o.id
  AND t.holder_age IS NULL
  AND o.customer_email IS NOT NULL
  AND u.age IS NOT NULL
  AND u.age > 0;

-- ========================================
-- 4. Also update user_id on tickets if missing
-- ========================================

UPDATE tickets t
SET user_id = u.id
FROM orders o
INNER JOIN users u ON u.email = o.customer_email
WHERE t.order_id = o.id
  AND t.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND u.id IS NOT NULL;

-- ========================================
-- 5. Verify the updates
-- ========================================

SELECT 
  'After email match update' as report_type,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN holder_name IS NOT NULL AND holder_name != '' THEN 1 END) as tickets_with_name,
  COUNT(CASE WHEN holder_age IS NOT NULL THEN 1 END) as tickets_with_age,
  COUNT(CASE WHEN (holder_name IS NOT NULL AND holder_name != '') AND holder_age IS NOT NULL THEN 1 END) as tickets_with_both
FROM tickets;

-- ========================================
-- 6. Show remaining tickets without holder info
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name,
  t.holder_age,
  t.user_id,
  o.customer_email,
  o.customer_name as order_customer_name
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
WHERE (t.holder_name IS NULL OR t.holder_name = '')
   OR t.holder_age IS NULL
ORDER BY t.created_at DESC;
