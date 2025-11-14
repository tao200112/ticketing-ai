-- ========================================
-- ENUM 化 status 字段：避免脏数据
-- 迁移日期：2025-01-15
-- 目标：将 TEXT status 字段迁移到 ENUM 类型
-- ========================================

-- ========================================
-- Step 1: 清理现有数据（统一格式）
-- ========================================

-- Orders status 清理
UPDATE orders
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

-- 修复常见拼写错误
UPDATE orders
SET status = 'paid'
WHERE status IN ('payed', 'Payed', 'Paid', 'PAID');

UPDATE orders
SET status = 'pending'
WHERE status IN ('Pending', 'PENDING', 'pending');

UPDATE orders
SET status = 'failed'
WHERE status IN ('Failed', 'FAILED', 'fail');

UPDATE orders
SET status = 'refunded'
WHERE status IN ('Refunded', 'REFUNDED', 'refund');

-- Tickets status 清理
UPDATE tickets
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

UPDATE tickets
SET status = 'unused'
WHERE status IN ('Unused', 'UNUSED', 'available', 'Available');

UPDATE tickets
SET status = 'used'
WHERE status IN ('Used', 'USED', 'redeemed', 'Redeemed');

UPDATE tickets
SET status = 'revoked'
WHERE status IN ('Revoked', 'REVOKED', 'cancelled', 'Cancelled', 'refunded', 'Refunded');

-- ========================================
-- Step 2: 添加新的 ENUM 列（临时）
-- ========================================

-- Orders: 添加新列
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_enum orders_status;

-- Tickets: 添加新列
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status_enum ticket_status;

-- ========================================
-- Step 3: 迁移数据到新列
-- ========================================

-- Orders: 迁移数据
UPDATE orders
SET status_enum = CASE
  WHEN status = 'pending' THEN 'pending'::orders_status
  WHEN status = 'paid' THEN 'paid'::orders_status
  WHEN status = 'failed' THEN 'failed'::orders_status
  WHEN status = 'refunded' THEN 'refunded'::orders_status
  ELSE 'pending'::orders_status  -- 默认值
END
WHERE status_enum IS NULL;

-- Tickets: 迁移数据
UPDATE tickets
SET status_enum = CASE
  WHEN status = 'unused' THEN 'unused'::ticket_status
  WHEN status = 'used' THEN 'used'::ticket_status
  WHEN status = 'revoked' THEN 'revoked'::ticket_status
  ELSE 'unused'::ticket_status  -- 默认值
END
WHERE status_enum IS NULL;

-- ========================================
-- Step 4: 删除旧列约束，重命名新列
-- ========================================

-- Orders: 删除旧约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 删除旧列，重命名新列
ALTER TABLE orders DROP COLUMN IF EXISTS status;
ALTER TABLE orders RENAME COLUMN status_enum TO status;

-- 添加 NOT NULL 约束
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::orders_status;

-- Tickets: 删除旧约束
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- 删除旧列，重命名新列
ALTER TABLE tickets DROP COLUMN IF EXISTS status;
ALTER TABLE tickets RENAME COLUMN status_enum TO status;

-- 添加 NOT NULL 约束
ALTER TABLE tickets ALTER COLUMN status SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'unused'::ticket_status;

-- ========================================
-- Step 5: 添加注释
-- ========================================

COMMENT ON COLUMN orders.status IS 'Order status using ENUM type (pending, paid, failed, refunded)';
COMMENT ON COLUMN tickets.status IS 'Ticket status using ENUM type (unused, used, revoked). DEPRECATED: Prefer using used field.';

-- ========================================
-- 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Status Fields ENUM Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'orders.status is now orders_status ENUM';
  RAISE NOTICE 'tickets.status is now ticket_status ENUM';
  RAISE NOTICE 'All data has been cleaned and migrated';
  RAISE NOTICE 'Next: Run short_id refactoring';
  RAISE NOTICE '========================================';
END $$;

