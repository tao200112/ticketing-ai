-- 修复数据库结构 - 添加缺失的字段
-- 在 Supabase SQL Editor 中运行此脚本

-- ========================================
-- 1. 添加缺失的字段到 orders 表
-- ========================================

-- 添加 stripe_session_id 字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

-- 添加 customer_email 字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 添加 tier 字段（票务等级）
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'general';

-- 添加 currency 字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- ========================================
-- 2. 添加缺失的字段到 tickets 表
-- ========================================

-- 添加 short_id 字段（短票据ID）
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;

-- 添加 holder_email 字段
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS holder_email TEXT;

-- 添加 tier 字段
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'general';

-- 添加 price_cents 字段
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;

-- 添加 qr_payload 字段（二维码载荷）
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS qr_payload TEXT;

-- 添加 issued_at 字段
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();

-- 修改 status 字段的默认值和约束
ALTER TABLE tickets 
ALTER COLUMN status SET DEFAULT 'unused';

-- 更新 status 约束
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets 
ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('unused', 'used', 'cancelled'));

-- ========================================
-- 3. 添加缺失的字段到 events 表
-- ========================================

-- 添加 slug 字段
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 添加 poster_url 字段
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- 添加 venue_name 字段
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS venue_name TEXT;

-- 添加 start_at 和 end_at 字段（重命名现有字段）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- 更新 start_at 和 end_at 字段
UPDATE events 
SET start_at = start_date, end_at = end_date 
WHERE start_at IS NULL OR end_at IS NULL;

-- 修改 status 字段的约束
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events 
ADD CONSTRAINT events_status_check 
CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));

-- ========================================
-- 4. 创建 prices 表（替代 ticket_types）
-- ========================================

CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  inventory INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 5. 创建索引
-- ========================================

-- orders 表索引
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- tickets 表索引
CREATE INDEX IF NOT EXISTS idx_tickets_short_id ON tickets(short_id);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_email ON tickets(holder_email);

-- events 表索引
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- prices 表索引
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON prices(event_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);

-- ========================================
-- 6. 更新 RLS 策略
-- ========================================

-- 启用 prices 表的 RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- 创建 prices 表的策略
CREATE POLICY "Allow public read for active prices" ON prices 
FOR SELECT USING (is_active = true);

CREATE POLICY "Allow merchants to manage their event prices" ON prices 
FOR ALL USING (
  event_id IN (
    SELECT id FROM events 
    WHERE merchant_id IN (
      SELECT id FROM merchants 
      WHERE owner_user_id = auth.uid()
    )
  )
);

-- 更新 orders 表的策略
DROP POLICY IF EXISTS "Allow all operations" ON orders;

CREATE POLICY "Allow users to read their own orders" ON orders 
FOR SELECT USING (customer_email = auth.jwt() ->> 'email');

CREATE POLICY "Allow service role to manage orders" ON orders 
FOR ALL USING (auth.role() = 'service_role');

-- 更新 tickets 表的策略
DROP POLICY IF EXISTS "Allow all operations" ON tickets;

CREATE POLICY "Allow users to read their own tickets" ON tickets 
FOR SELECT USING (holder_email = auth.jwt() ->> 'email');

CREATE POLICY "Allow service role to manage tickets" ON tickets 
FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 7. 验证更新
-- ========================================

-- 显示表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 显示索引
SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes 
WHERE tablename IN ('orders', 'tickets', 'events', 'prices')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
