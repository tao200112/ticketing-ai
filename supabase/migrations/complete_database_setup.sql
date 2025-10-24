-- 完整的数据库设置脚本
-- 创建所有必要的表和索引

-- ========================================
-- 用户表
-- ========================================
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

-- ========================================
-- 管理员邀请码表
-- ========================================
CREATE TABLE IF NOT EXISTS admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 商家表
-- ========================================
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

-- ========================================
-- 活动表
-- ========================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 活动价格表
-- ========================================
CREATE TABLE IF NOT EXISTS event_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  inventory INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_email TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 创建索引
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_user_id ON merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_contact_email ON merchants(contact_email);
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_prices_event_id ON event_prices(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_merchant_id ON tickets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_email ON tickets(holder_email);
CREATE INDEX IF NOT EXISTS idx_tickets_verified_at ON tickets(verified_at);

-- ========================================
-- 插入默认管理员账号
-- ========================================
INSERT INTO users (email, name, age, password_hash, role, is_active) 
VALUES (
  'admin@partytix.com',
  'Admin User',
  25,
  '$2b$10$9C1ympkGwmvLWuVtJtic6OhWpYewlZlUOe2Mdk97cg7SHYJkCpI9a', -- password: admin123
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 插入默认邀请码
-- ========================================
INSERT INTO admin_invite_codes (code, is_active, expires_at) 
VALUES (
  'WELCOME2024',
  true,
  '2025-12-31T23:59:59Z'
) ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 启用行级安全策略 (RLS)
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 创建基本的安全策略
-- ========================================
-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 商家可以查看自己的数据
CREATE POLICY "Merchants can view own data" ON merchants
  FOR SELECT USING (auth.uid() = owner_user_id);

-- 公开活动可以被所有人查看
CREATE POLICY "Events are publicly viewable" ON events
  FOR SELECT USING (status = 'published');

-- 订单和票据的访问策略
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- 完成设置
-- ========================================
SELECT 'Database setup completed successfully!' as status;
