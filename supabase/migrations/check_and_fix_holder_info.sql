-- Check and Fix Holder Information
-- This script helps diagnose and fix missing holder_name and holder_age

-- ========================================
-- 1. Check current state of holder information
-- ========================================

-- Check tickets without holder_name
SELECT 
  'Tickets without holder_name' as check_type,
  COUNT(*) as count
FROM tickets t
WHERE t.holder_name IS NULL OR t.holder_name = '';

-- Check tickets without holder_age
SELECT 
  'Tickets without holder_age' as check_type,
  COUNT(*) as count
FROM tickets t
WHERE t.holder_age IS NULL;

-- Check tickets with order but missing holder info
SELECT 
  t.id as ticket_id,
  t.short_id,
  t.holder_name as ticket_holder_name,
  t.holder_age as ticket_holder_age,
  o.customer_name as order_customer_name,
  o.customer_age as order_customer_age,
  o.id as order_id
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
WHERE (t.holder_name IS NULL OR t.holder_name = '')
   OR t.holder_age IS NULL
LIMIT 10;

-- ========================================
-- 2. Update holder_name from orders (if missing)
-- ========================================

UPDATE tickets t
SET holder_name = o.customer_name
FROM orders o
WHERE t.order_id = o.id
  AND (t.holder_name IS NULL OR t.holder_name = '')
  AND o.customer_name IS NOT NULL
  AND o.customer_name != '';

-- Check how many were updated
SELECT 
  'Updated holder_name from orders' as action,
  COUNT(*) as count
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
WHERE t.holder_name = o.customer_name
  AND o.customer_name IS NOT NULL
  AND o.customer_name != '';

-- ========================================
-- 3. Update holder_age from orders (if missing)
-- ========================================

UPDATE tickets t
SET holder_age = o.customer_age
FROM orders o
WHERE t.order_id = o.id
  AND t.holder_age IS NULL
  AND o.customer_age IS NOT NULL
  AND o.customer_age > 0;

-- Check how many were updated
SELECT 
  'Updated holder_age from orders' as action,
  COUNT(*) as count
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
WHERE t.holder_age = o.customer_age
  AND o.customer_age IS NOT NULL
  AND o.customer_age > 0;

-- ========================================
-- 4. Try to get age from users table (if ticket has user_id)
-- ========================================

-- Check tickets with user_id but missing holder_age
SELECT 
  t.id as ticket_id,
  t.short_id,
  t.user_id,
  u.age as user_age,
  t.holder_age as ticket_holder_age
FROM tickets t
INNER JOIN users u ON t.user_id = u.id
WHERE t.holder_age IS NULL
  AND u.age IS NOT NULL
  AND u.age > 0
LIMIT 10;

-- Update holder_age from users table
UPDATE tickets t
SET holder_age = u.age
FROM users u
WHERE t.user_id = u.id
  AND t.holder_age IS NULL
  AND u.age IS NOT NULL
  AND u.age > 0;

-- ========================================
-- 5. Final summary
-- ========================================

SELECT 
  'Summary' as report_type,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN holder_name IS NOT NULL AND holder_name != '' THEN 1 END) as tickets_with_name,
  COUNT(CASE WHEN holder_age IS NOT NULL THEN 1 END) as tickets_with_age,
  COUNT(CASE WHEN (holder_name IS NOT NULL AND holder_name != '') AND holder_age IS NOT NULL THEN 1 END) as tickets_with_both
FROM tickets;
