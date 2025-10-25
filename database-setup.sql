-- PartyTix 完整数据库设置
-- 运行此脚本在 Supabase SQL Editor 中

-- ========================================
-- 1. 创建表结构
-- ========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 16),
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员邀请码表
CREATE TABLE IF NOT EXISTS admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商家表
CREATE TABLE IF NOT EXISTS merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  verified BOOLEAN DEFAULT false,
  max_events INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 活动表
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  max_attendees INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 票务类型表
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  sold_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  total_amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 票务表
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. 创建索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_merchants_owner ON merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_events_merchant ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON tickets(qr_code);

-- ========================================
-- 3. 插入示例数据
-- ========================================

-- 插入用户数据
INSERT INTO users (email, name, age, password_hash, role) VALUES 
('admin@partytix.com', 'System Administrator', 30, '$2b$10$w8twXczR.00hZ7tg8x4rr.nzDOOk5JjOPeu5vxcvyMhrUq7Esujkq', 'admin'),
('john@example.com', 'John Smith', 25, '$2b$10$dmQqlnUG1C3lcfyoyd5PyuTy3sxGmX3oTR4kjfxGdJg3paKgZwLie', 'user'),
('jane@example.com', 'Jane Doe', 28, '$2b$10$y0ya5PkEJ9V.wnyV2fhwrend/EILwNtkpIzuJi.hnewovbotZ3yX2', 'user'),
('merchant1@example.com', 'Event Organizer', 35, '$2b$10$uDNZaIJslT7wHev4Xi8HuujM4gzbCJ.9ZamGhdOtwTlkmadov7jdW', 'merchant'),
('merchant2@example.com', 'Concert Manager', 32, '$2b$10$prPRu0QEXrIA2V86n/0kauLuDDHoF9.H9Z9OglZAbPwMb9YRdRYEm', 'merchant');

-- 获取用户ID用于外键关联
DO $$
DECLARE
    admin_user_id UUID;
    merchant1_user_id UUID;
    merchant2_user_id UUID;
BEGIN
    -- 获取用户ID
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@partytix.com';
    SELECT id INTO merchant1_user_id FROM users WHERE email = 'merchant1@example.com';
    SELECT id INTO merchant2_user_id FROM users WHERE email = 'merchant2@example.com';
    
    -- 插入商家数据
    INSERT INTO merchants (owner_user_id, name, contact_email, contact_phone, status, verified, max_events) VALUES 
    (merchant1_user_id, 'Music Events Co.', 'merchant1@example.com', '+1-555-0101', 'active', true, 20),
    (merchant2_user_id, 'Concert Hall', 'merchant2@example.com', '+1-555-0102', 'active', true, 15);
    
    -- 获取商家ID
    DECLARE
        music_events_id UUID;
        concert_hall_id UUID;
    BEGIN
        SELECT id INTO music_events_id FROM merchants WHERE name = 'Music Events Co.';
        SELECT id INTO concert_hall_id FROM merchants WHERE name = 'Concert Hall';
        
        -- 插入活动数据
        INSERT INTO events (merchant_id, title, description, start_date, end_date, location, max_attendees, status) VALUES 
        (music_events_id, 'Summer Music Festival', 'A three-day music festival featuring top artists', '2024-07-15T18:00:00Z', '2024-07-17T23:00:00Z', 'Central Park, New York', 5000, 'active'),
        (concert_hall_id, 'Jazz Night', 'An intimate jazz performance in a cozy venue', '2024-06-20T20:00:00Z', '2024-06-20T23:00:00Z', 'Blue Note Jazz Club', 200, 'active'),
        (music_events_id, 'Food & Wine Festival', 'A culinary experience with local chefs and wineries', '2024-08-10T12:00:00Z', '2024-08-10T20:00:00Z', 'Downtown Plaza', 1000, 'active');
    END;
END $$;

-- 插入邀请码数据
INSERT INTO admin_invite_codes (code, is_active, expires_at) VALUES 
('ADMIN_INV_2024_001', true, '2024-12-31T23:59:59Z'),
('ADMIN_INV_2024_002', true, '2024-12-31T23:59:59Z');

-- ========================================
-- 4. 设置行级安全策略 (RLS)
-- ========================================

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建基本策略（允许所有操作，实际部署时应更严格）
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON merchants FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON events FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);

-- ========================================
-- 5. 验证数据
-- ========================================

-- 显示插入的数据统计
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Merchants', COUNT(*) FROM merchants
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Invite Codes', COUNT(*) FROM admin_invite_codes;
