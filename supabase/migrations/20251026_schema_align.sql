-- ========================================
-- PR-7: Schema Alignment Migration
-- ========================================
-- 功能：修复数据库表结构与代码不一致问题
-- 原则：幂等执行，仅新增/回填/建索引/建策略，不删除现有数据
-- 兼容：与 FIELD_MAPPING_V2.md 和 lib/db/types.ts 保持一致

BEGIN;

-- ========================================
-- 1. Orders 表修复
-- ========================================

-- 添加 stripe_session_id 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'stripe_session_id') THEN
        ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;
    END IF;
END $$;

-- 回填数据：如果存在旧列 session_id 且新列为空，则回填
UPDATE orders 
SET stripe_session_id = session_id 
WHERE stripe_session_id IS NULL 
  AND session_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'orders' AND column_name = 'session_id');

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON public.orders(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- ========================================
-- 2. Events 表修复
-- ========================================

-- 添加 slug 列
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'slug') THEN
        ALTER TABLE events ADD COLUMN slug TEXT;
    END IF;
END $$;

-- 添加 status 列
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
END $$;

-- 为缺少 slug 的行自动生成 slug
UPDATE events 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            COALESCE(title, name, description, 'event-' || SUBSTRING(id::text, 1, 8)),
            '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
    )
)
WHERE slug IS NULL OR slug = '';

-- 处理重复的 slug（添加后缀）
WITH duplicate_slugs AS (
    SELECT slug, COUNT(*) as cnt
    FROM events 
    WHERE slug IS NOT NULL
    GROUP BY slug 
    HAVING COUNT(*) > 1
),
numbered_events AS (
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM events 
    WHERE slug IN (SELECT slug FROM duplicate_slugs)
)
UPDATE events 
SET slug = events.slug || '-' || (numbered_events.rn - 1)
FROM numbered_events 
WHERE events.id = numbered_events.id 
  AND numbered_events.rn > 1;

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique 
ON public.events(slug) 
WHERE slug IS NOT NULL;

-- ========================================
-- 3. Prices 表修复（作为唯一价格表）
-- ========================================

-- 确保 prices 表存在所有必需列
DO $$ 
BEGIN
    -- 添加缺失的列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'id') THEN
        ALTER TABLE prices ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'event_id') THEN
        ALTER TABLE prices ADD COLUMN event_id UUID NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'name') THEN
        ALTER TABLE prices ADD COLUMN name TEXT NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'amount_cents') THEN
        ALTER TABLE prices ADD COLUMN amount_cents INTEGER NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'currency') THEN
        ALTER TABLE prices ADD COLUMN currency TEXT NOT NULL DEFAULT 'usd';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'is_active') THEN
        ALTER TABLE prices ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'inventory') THEN
        ALTER TABLE prices ADD COLUMN inventory INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'valid_from') THEN
        ALTER TABLE prices ADD COLUMN valid_from TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'valid_to') THEN
        ALTER TABLE prices ADD COLUMN valid_to TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'limit_per_user') THEN
        ALTER TABLE prices ADD COLUMN limit_per_user INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'sold_count') THEN
        ALTER TABLE prices ADD COLUMN sold_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 建立外键约束
ALTER TABLE prices 
ADD CONSTRAINT IF NOT EXISTS prices_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON prices(event_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active) WHERE is_active = TRUE;

-- ========================================
-- 4. 启用 RLS 并创建策略
-- ========================================

-- 启用 RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Events 公开读取策略
CREATE POLICY IF NOT EXISTS "events_select_published"
  ON events FOR SELECT
  USING (status IN ('published', 'active'));

-- Events 商家管理策略
CREATE POLICY IF NOT EXISTS "events_manage_own"
  ON events FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE owner_user_id = auth.uid()
    )
  );

-- Prices 公开读取策略
CREATE POLICY IF NOT EXISTS "prices_select_active"
  ON prices FOR SELECT
  USING (
    is_active = TRUE 
    AND event_id IN (SELECT id FROM events WHERE status IN ('published', 'active'))
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_to IS NULL OR valid_to >= NOW())
  );

-- Prices 商家管理策略
CREATE POLICY IF NOT EXISTS "prices_manage_own"
  ON prices FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Orders 用户读取策略
CREATE POLICY IF NOT EXISTS "orders_select_own"
  ON orders FOR SELECT
  USING (
    customer_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Orders 服务端写入策略
CREATE POLICY IF NOT EXISTS "orders_insert_allow"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Tickets 用户读取策略
CREATE POLICY IF NOT EXISTS "tickets_select_own"
  ON tickets FOR SELECT
  USING (
    holder_email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Tickets 服务端写入策略
CREATE POLICY IF NOT EXISTS "tickets_insert_allow"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- ========================================
-- 5. 数据完整性检查
-- ========================================

-- 确保所有 events 都有 status
UPDATE events SET status = 'published' WHERE status IS NULL;

-- 确保所有 prices 都有 is_active
UPDATE prices SET is_active = TRUE WHERE is_active IS NULL;

-- 设置默认有效期
UPDATE prices 
SET 
  valid_from = COALESCE(valid_from, NOW()),
  valid_to = COALESCE(valid_to, NOW() + INTERVAL '1 year')
WHERE valid_from IS NULL OR valid_to IS NULL;

COMMIT;

-- ========================================
-- 6. 验证查询
-- ========================================

-- 显示修复结果
SELECT 
  'Schema alignment completed' as status,
  (SELECT COUNT(*) FROM events WHERE slug IS NOT NULL) as events_with_slug,
  (SELECT COUNT(*) FROM events WHERE status IS NOT NULL) as events_with_status,
  (SELECT COUNT(*) FROM prices WHERE is_active = TRUE) as active_prices,
  (SELECT COUNT(*) FROM orders WHERE stripe_session_id IS NOT NULL) as orders_with_stripe_session_id;
