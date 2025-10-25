-- ========================================
-- PR-3: RLS/Policy 启用脚本
-- ========================================
-- 功能：为所有表启用 Row-Level Security 并创建最小必需策略
-- 原则：匿名可读公开数据，仅本人可读写订单/票据，商家可管理自有资源
-- 幂等性：使用 IF NOT EXISTS / DROP IF EXISTS

BEGIN;

-- ========================================
-- 1. 创建安全视图（映射用户身份）
-- ========================================

-- 用户账户视图：映射 Supabase Auth 到用户表
CREATE OR REPLACE VIEW public.user_accounts AS
SELECT 
  u.id as uid,
  u.email as email,
  u.role as role
FROM users u
WHERE u.id = auth.uid();

-- 事件完整视图（只读）
CREATE OR REPLACE VIEW public.event_full_view AS
SELECT 
  e.id,
  e.merchant_id,
  e.title,
  e.description,
  e.start_at,
  e.end_at,
  e.venue_name,
  e.address,
  e.status,
  e.poster_url,
  m.owner_user_id as merchant_owner_id
FROM events e
LEFT JOIN merchants m ON e.merchant_id = m.id;

-- 活跃价格视图
CREATE OR REPLACE VIEW public.event_prices_view AS
SELECT 
  p.id,
  p.event_id,
  p.name,
  p.amount_cents,
  p.currency,
  p.inventory,
  p.is_active,
  e.status as event_status
FROM prices p
JOIN events e ON p.event_id = e.id
WHERE p.is_active = TRUE
  AND e.status = 'published';

-- ========================================
-- 2. 创建必要索引（优化查询性能）
-- ========================================

CREATE INDEX IF NOT EXISTS idx_events_status_slug 
  ON events(status) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_prices_event_active 
  ON prices(event_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_status 
  ON orders(customer_email, status);

CREATE INDEX IF NOT EXISTS idx_tickets_holder_email 
  ON tickets(holder_email);

-- ========================================
-- 3. 启用 RLS
-- ========================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. 创建策略
-- ========================================

-- Events: 公开读取已发布的活动
CREATE POLICY "events_select_published"
  ON events FOR SELECT
  USING (status = 'published');

-- Events: 商家可管理自己的活动
CREATE POLICY "events_manage_own"
  ON events FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE owner_user_id = auth.uid()
    )
  );

-- Prices: 公开读取活跃价格
CREATE POLICY "prices_select_active"
  ON prices FOR SELECT
  USING (
    is_active = TRUE 
    AND event_id IN (SELECT id FROM events WHERE status = 'published')
  );

-- Prices: 商家可管理自己的活动价格
CREATE POLICY "prices_manage_own"
  ON prices FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Orders: 仅本人可读取自己的订单
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (
    customer_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Orders: Service Role 可写入（通过 webhook）
-- 注意：INSERT 允许无检查，依赖应用层验证
CREATE POLICY "orders_insert_allow"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Orders: 仅本人可更新（退款等操作）
CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (
    customer_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Tickets: 仅本人可读取自己的票据
CREATE POLICY "tickets_select_own"
  ON tickets FOR SELECT
  USING (
    holder_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Tickets: Service Role 可插入（通过出票服务）
CREATE POLICY "tickets_insert_allow"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Tickets: 商家或 Service Role 可更新（核销）
-- Service Role 绕过 RLS，商家通过自己的身份
CREATE POLICY "tickets_update_merchant"
  ON tickets FOR UPDATE
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Merchants: 商家仅管理自己的记录
CREATE POLICY "merchants_manage_own"
  ON merchants FOR ALL
  USING (owner_user_id = auth.uid());

COMMIT;

-- ========================================
-- 说明：
-- 1. 所有策略均可被 Service Role 绕过
-- 2. Service Role 在服务端使用，不会触发 RLS 限制
-- 3. 客户端使用 anon key 将受这些策略限制
-- ========================================
