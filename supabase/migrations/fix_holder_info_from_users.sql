-- Fix Holder Info from Users Table
-- This script updates tickets with holder_name and holder_age from users table
-- when tickets have user_id but missing holder information

-- ========================================
-- 1. Update holder_name from users table (if ticket has user_id but no holder_name)
-- ========================================

UPDATE tickets t
SET holder_name = u.name
FROM users u
WHERE t.user_id = u.id
  AND (t.holder_name IS NULL OR t.holder_name = '')
  AND u.name IS NOT NULL
  AND u.name != '';

-- ========================================
-- 2. Update holder_age from users table (if ticket has user_id but no holder_age)
-- ========================================

UPDATE tickets t
SET holder_age = u.age
FROM users u
WHERE t.user_id = u.id
  AND t.holder_age IS NULL
  AND u.age IS NOT NULL
  AND u.age > 0;

-- ========================================
-- 3. Verify the updates
-- ========================================

SELECT 
  'After users table update' as report_type,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN holder_name IS NOT NULL AND holder_name != '' THEN 1 END) as tickets_with_name,
  COUNT(CASE WHEN holder_age IS NOT NULL THEN 1 END) as tickets_with_age,
  COUNT(CASE WHEN (holder_name IS NOT NULL AND holder_name != '') AND holder_age IS NOT NULL THEN 1 END) as tickets_with_both
FROM tickets;

-- ========================================
-- 4. Show remaining tickets without holder info
-- ========================================

SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name,
  t.holder_age,
  t.order_id,
  o.customer_name as order_customer_name,
  o.customer_age as order_customer_age,
  t.user_id,
  u.name as user_name,
  u.age as user_age
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN users u ON t.user_id = u.id
WHERE (t.holder_name IS NULL OR t.holder_name = '')
   OR t.holder_age IS NULL
ORDER BY t.created_at DESC;
