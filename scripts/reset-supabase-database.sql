-- ============================================
-- 🔄 Supabase数据库重置脚本
-- ============================================
-- 用途: 清理Supabase缓存，重新创建数据库结构
-- 运行方式: 复制到 Supabase Dashboard > SQL Editor 执行
-- ============================================

-- 1. 清理所有现有数据
-- ============================================

-- 删除所有表（按依赖关系顺序）
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_invite_codes CASCADE;

-- 删除所有视图
DROP VIEW IF EXISTS events_overview CASCADE;
DROP VIEW IF EXISTS merchant_stats CASCADE;

-- 删除所有函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_inventory_constraint() CASCADE;
DROP FUNCTION IF EXISTS check_event_attendees_constraint() CASCADE;

-- 2. 重新创建数据库结构
-- ============================================

-- 创建用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 16),
  password_hash TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建商家表
CREATE TABLE merchants (
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

-- 创建管理员邀请码表
CREATE TABLE admin_invite_codes (
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

-- 创建活动表
CREATE TABLE events (
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

-- 创建价格表
CREATE TABLE prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  inventory INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  limit_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建订单表
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE,
  payment_intent TEXT,
  customer_email TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建票据表
CREATE TABLE tickets (
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

-- 3. 创建索引
-- ============================================

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 商家表索引
CREATE INDEX idx_merchants_owner_user_id ON merchants(owner_user_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_verified ON merchants(verified);

-- 邀请码表索引
CREATE INDEX idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX idx_admin_invite_codes_active ON admin_invite_codes(is_active, expires_at);

-- 活动表索引
CREATE INDEX idx_events_merchant_id ON events(merchant_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_created_at ON events(created_at);

-- 价格表索引
CREATE INDEX idx_prices_event_id ON prices(event_id);
CREATE INDEX idx_prices_is_active ON prices(is_active);

-- 订单表索引
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 票据表索引
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_short_id ON tickets(short_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_holder_email ON tickets(holder_email);

-- 4. 创建触发器函数
-- ============================================

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 库存检查函数
CREATE OR REPLACE FUNCTION check_inventory_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sold_count > NEW.inventory THEN
        RAISE EXCEPTION 'Sold count cannot exceed inventory';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 活动参与人数检查函数
CREATE OR REPLACE FUNCTION check_event_attendees_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_attendees IS NOT NULL AND NEW.current_attendees > NEW.max_attendees THEN
        RAISE EXCEPTION 'Current attendees cannot exceed max attendees';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器
-- ============================================

-- 用户表更新时间触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 商家表更新时间触发器
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 活动表更新时间触发器
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 价格表更新时间触发器
CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 订单表更新时间触发器
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 价格库存检查触发器
CREATE TRIGGER check_prices_inventory 
    BEFORE INSERT OR UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION check_inventory_constraint();

-- 活动参与人数检查触发器
CREATE TRIGGER check_events_attendees 
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION check_event_attendees_constraint();

-- 6. 创建视图
-- ============================================

-- 活动概览视图
CREATE VIEW events_overview AS
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

-- 商家统计视图
CREATE VIEW merchant_stats AS
SELECT 
    m.id,
    m.name,
    m.verified,
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_events,
    SUM(CASE WHEN e.status = 'published' THEN e.current_attendees ELSE 0 END) as total_attendees,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(CASE WHEN o.status = 'paid' THEN o.total_amount_cents ELSE 0 END) as total_revenue_cents
FROM merchants m
LEFT JOIN events e ON m.id = e.merchant_id
LEFT JOIN orders o ON e.id = o.event_id
GROUP BY m.id, m.name, m.verified;

-- 7. 插入测试数据
-- ============================================

-- 插入测试用户
INSERT INTO users (email, name, age, password_hash, role) VALUES
('admin@partytix.com', 'Admin User', 25, '$2a$10$example', 'admin'),
('merchant@partytix.com', 'Merchant User', 30, '$2a$10$example', 'merchant'),
('user@partytix.com', 'Regular User', 22, '$2a$10$example', 'user');

-- 插入测试商家
INSERT INTO merchants (owner_user_id, name, description, contact_email, verified, status) VALUES
((SELECT id FROM users WHERE email = 'merchant@partytix.com'), 'Test Merchant', 'A test merchant for development', 'merchant@partytix.com', true, 'active');

-- 插入测试活动
INSERT INTO events (merchant_id, title, description, start_at, end_at, venue_name, address, status, max_attendees) VALUES
((SELECT id FROM merchants WHERE name = 'Test Merchant'), 'Ridiculous Chicken Night Event', 'Enjoy delicious chicken and an amazing night at Virginia Tech''s most popular event.', '2025-10-25T20:00:00Z', '2025-10-25T23:00:00Z', 'Shanghai Concert Hall', 'Shanghai Concert Hall', 'published', 150);

-- 插入测试价格
INSERT INTO prices (event_id, name, description, amount_cents, currency, inventory, limit_per_user) VALUES
((SELECT id FROM events WHERE title = 'Ridiculous Chicken Night Event'), 'Regular Ticket (21+)', 'Regular admission ticket', 1500, 'USD', 100, 5),
((SELECT id FROM events WHERE title = 'Ridiculous Chicken Night Event'), 'Special Ticket (18-20)', 'Special admission ticket', 3000, 'USD', 50, 2);

-- 8. 启用行级安全 (RLS)
-- ============================================

-- 启用所有表的RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- 创建基本的RLS策略（允许所有操作，生产环境需要更严格的策略）
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on merchants" ON merchants FOR ALL USING (true);
CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all operations on prices" ON prices FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on tickets" ON tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_invite_codes" ON admin_invite_codes FOR ALL USING (true);

-- 9. 完成消息
-- ============================================

SELECT 'Supabase database reset and recreated successfully!' as message;
