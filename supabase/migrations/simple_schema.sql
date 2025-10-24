-- 最简单的 Supabase 架构
-- 专门解决 "column merchant_id does not exist" 错误

-- 删除现有表（如果需要重新开始）
-- 取消注释下面的行来清理现有表
-- DROP TABLE IF EXISTS tickets CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS prices CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS admin_invite_codes CASCADE;
-- DROP TABLE IF EXISTS merchants CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 创建用户表
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

-- 创建商家表
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

-- 创建邀请码表
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

-- 创建活动表
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

-- 创建价格表
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

-- 创建订单表
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

-- 创建票据表
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

-- 插入测试数据
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

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE 'Simple schema created successfully!';
    RAISE NOTICE 'All tables created without errors.';
END $$;
