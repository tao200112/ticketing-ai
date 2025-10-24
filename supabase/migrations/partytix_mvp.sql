-- PartyTix MVP Database Schema
-- 幂等 SQL 迁移文件 - 如果表存在则跳过
-- 运行方式：
-- 1. 本地 SQL: psql -d your_database -f supabase/migrations/partytix_mvp.sql
-- 2. Supabase SQL Editor: 复制粘贴到 Supabase Dashboard > SQL Editor

-- ========================================
-- 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 16),
  password_hash TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为用户表创建更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 商家表
-- ========================================
CREATE TABLE IF NOT EXISTS merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为商家表创建更新时间触发器
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 管理员邀请码表
-- ========================================
CREATE TABLE IF NOT EXISTS admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_events INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin'
);

-- 创建邀请码表索引
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_active ON admin_invite_codes(is_active, expires_at);

-- ========================================
-- 活动表
-- ========================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'US',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  poster_url TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为活动表创建更新时间触发器
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建活动表索引
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- ========================================
-- 价格表
-- ========================================
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'CNY')),
  inventory INTEGER DEFAULT 0 CHECK (inventory >= 0),
  sold_count INTEGER DEFAULT 0 CHECK (sold_count >= 0),
  limit_per_user INTEGER DEFAULT 4 CHECK (limit_per_user > 0),
  tier_sort INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为价格表创建更新时间触发器
DROP TRIGGER IF EXISTS update_prices_updated_at ON prices;
CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建价格表索引
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON prices(event_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);

-- ========================================
-- 订单表
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为订单表创建更新时间触发器
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ========================================
-- 票据表
-- ========================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  qr_payload TEXT,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'refunded')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建票据表索引
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_short_id ON tickets(short_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ========================================
-- 数据完整性约束函数
-- ========================================

-- 确保价格表中的 sold_count 不超过 inventory
CREATE OR REPLACE FUNCTION check_inventory_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sold_count > NEW.inventory THEN
        RAISE EXCEPTION 'Sold count cannot exceed inventory';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建价格库存检查触发器
DROP TRIGGER IF EXISTS check_prices_inventory ON prices;
CREATE TRIGGER check_prices_inventory 
    BEFORE INSERT OR UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION check_inventory_constraint();

-- 确保活动的当前参与人数不超过最大参与人数
CREATE OR REPLACE FUNCTION check_event_attendees_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_attendees IS NOT NULL AND NEW.current_attendees > NEW.max_attendees THEN
        RAISE EXCEPTION 'Current attendees cannot exceed max attendees';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建活动参与人数检查触发器
DROP TRIGGER IF EXISTS check_events_attendees ON events;
CREATE TRIGGER check_events_attendees 
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION check_event_attendees_constraint();

-- ========================================
-- 视图和函数
-- ========================================

-- 创建活动概览视图
CREATE OR REPLACE VIEW events_overview AS
SELECT 
    e.id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.venue_name,
    e.status,
    e.poster_url,
    e.current_attendees,
    e.max_attendees,
    m.name as merchant_name,
    m.verified as merchant_verified,
    COUNT(p.id) as price_count,
    MIN(p.amount_cents) as min_price_cents,
    MAX(p.amount_cents) as max_price_cents
FROM events e
LEFT JOIN merchants m ON e.merchant_id = m.id
LEFT JOIN prices p ON e.id = p.event_id AND p.is_active = true
GROUP BY e.id, e.title, e.description, e.start_at, e.end_at, e.venue_name, 
         e.status, e.poster_url, e.current_attendees, e.max_attendees, 
         m.name, m.verified;

-- 创建商家统计视图
CREATE OR REPLACE VIEW merchant_stats AS
SELECT 
    m.id,
    m.name,
    m.verified,
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_events,
    SUM(CASE WHEN e.status = 'published' THEN e.current_attendees ELSE 0 END) as total_attendees,
    SUM(CASE WHEN p.is_active = true THEN p.sold_count * p.amount_cents ELSE 0 END) as total_revenue_cents
FROM merchants m
LEFT JOIN events e ON m.id = e.merchant_id
LEFT JOIN prices p ON e.id = p.event_id
GROUP BY m.id, m.name, m.verified;

-- ========================================
-- 种子数据
-- ========================================

-- 插入 Ridiculous Chicken 商家（仅当不存在时）
INSERT INTO merchants (id, name, description, verified, status)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'Ridiculous Chicken',
    'Virginia Tech 附近的热门餐厅，提供美味的鸡肉和夜场娱乐',
    TRUE,
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM merchants WHERE name = 'Ridiculous Chicken'
);

-- ========================================
-- RLS (Row Level Security) 策略
-- ========================================
-- 注意：如果项目当前未开启 RLS，以下策略将不会生效
-- 如需启用 RLS，请先执行：ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Events RLS 策略
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 公开读取已发布的活动
-- CREATE POLICY "Events are publicly readable when published" ON events
--     FOR SELECT USING (status = 'published');

-- 商家拥有者可以管理自己的活动
-- CREATE POLICY "Merchants can manage their own events" ON events
--     FOR ALL USING (
--         merchant_id IN (
--             SELECT id FROM merchants WHERE owner_user_id = auth.uid()
--         )
--     );

-- Prices RLS 策略
-- ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- 公开读取活跃的价格
-- CREATE POLICY "Prices are publicly readable when active" ON prices
--     FOR SELECT USING (is_active = true);

-- 商家拥有者可以管理自己活动的价格
-- CREATE POLICY "Merchants can manage their event prices" ON prices
--     FOR ALL USING (
--         event_id IN (
--             SELECT e.id FROM events e
--             JOIN merchants m ON e.merchant_id = m.id
--             WHERE m.owner_user_id = auth.uid()
--         )
--     );

-- Users RLS 策略
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户可以查看和更新自己的信息
-- CREATE POLICY "Users can view and update own profile" ON users
--     FOR ALL USING (id = auth.uid());

-- Merchants RLS 策略
-- ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 商家拥有者可以管理自己的商家信息
-- CREATE POLICY "Merchants can manage their own business" ON merchants
--     FOR ALL USING (owner_user_id = auth.uid());

-- 公开读取已验证的商家信息
-- CREATE POLICY "Verified merchants are publicly readable" ON merchants
--     FOR SELECT USING (verified = true);

-- ========================================
-- 完成提示
-- ========================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE 'PartyTix MVP schema migration completed successfully!';
    RAISE NOTICE 'Tables created: users, merchants, admin_invite_codes, events, prices, orders, tickets';
    RAISE NOTICE 'Seed data inserted: Ridiculous Chicken merchant';
    RAISE NOTICE 'RLS policies are commented out - enable if needed';
    RAISE NOTICE 'Views created: events_overview, merchant_stats';
    RAISE NOTICE 'All triggers and constraints applied successfully';
END $$;