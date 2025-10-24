-- PartyTix Supabase Schema - 修复版本
-- 专门为 Supabase 优化，修复了所有已知问题
-- 在 Supabase SQL Editor 中运行此文件

-- ========================================
-- 清理现有表（如果需要重新开始）
-- ========================================
-- 注意：取消注释下面的行来清理现有表
-- DROP TABLE IF EXISTS tickets CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS prices CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS admin_invite_codes CASCADE;
-- DROP TABLE IF EXISTS merchants CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

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

-- ========================================
-- 索引
-- ========================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 商家表索引
CREATE INDEX IF NOT EXISTS idx_merchants_owner_user_id ON merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

-- 邀请码表索引
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_active ON admin_invite_codes(is_active, expires_at);

-- 活动表索引
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- 价格表索引
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON prices(event_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 票据表索引
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_short_id ON tickets(short_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ========================================
-- 更新时间触发器函数
-- ========================================

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建更新时间触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON merchants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

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
-- 完成提示
-- ========================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE 'PartyTix Supabase schema migration completed successfully!';
    RAISE NOTICE 'Tables created: users, merchants, admin_invite_codes, events, prices, orders, tickets';
    RAISE NOTICE 'All indexes and triggers applied successfully';
    RAISE NOTICE 'Seed data inserted: Ridiculous Chicken merchant';
    RAISE NOTICE 'Schema is ready for use!';
END $$;
