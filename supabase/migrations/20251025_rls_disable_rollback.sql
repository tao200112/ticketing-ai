-- ========================================
-- PR-3: RLS/Policy 回滚脚本
-- ========================================
-- 功能：完全撤销 RLS 策略并删除相关视图
-- 幂等性：使用 DROP IF EXISTS

BEGIN;

-- ========================================
-- 1. 删除所有策略
-- ========================================

DROP POLICY IF EXISTS "events_select_published" ON events;
DROP POLICY IF EXISTS "events_manage_own" ON events;

DROP POLICY IF EXISTS "prices_select_active" ON prices;
DROP POLICY IF EXISTS "prices_manage_own" ON prices;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_allow" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;

DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
DROP POLICY IF EXISTS "tickets_insert_allow" ON tickets;
DROP POLICY IF EXISTS "tickets_update_merchant" ON tickets;

DROP POLICY IF EXISTS "merchants_manage_own" ON merchants;

-- ========================================
-- 2. 禁用 RLS
-- ========================================

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. 删除安全视图
-- ========================================

DROP VIEW IF EXISTS public.user_accounts;
DROP VIEW IF EXISTS public.event_full_view;
DROP VIEW IF EXISTS public.event_prices_view;

-- ========================================
-- 4. 删除额外索引（可选，保留不影响）
-- ========================================

-- 注意：主键和原有索引保留，只删除 PR-3 新增的
DROP INDEX IF EXISTS idx_events_status_slug;
DROP INDEX IF EXISTS idx_prices_event_active;
DROP INDEX IF EXISTS idx_orders_customer_email_status;
DROP INDEX IF EXISTS idx_tickets_holder_email;

COMMIT;

-- ========================================
-- 回滚完成
-- ========================================
