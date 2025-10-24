-- 快速修复线上数据库问题
-- 解决 "column is_active does not exist" 错误

-- 1. 检查并添加缺失的列
DO $$
BEGIN
    -- 添加 is_active 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to users table';
    END IF;
    
    -- 添加 role 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added role column to users table';
    END IF;
    
    -- 添加 age 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') THEN
        ALTER TABLE users ADD COLUMN age INTEGER DEFAULT 18;
        RAISE NOTICE 'Added age column to users table';
    END IF;
    
    -- 添加 password_hash 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column to users table';
    END IF;
    
    -- 添加 created_at 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to users table';
    END IF;
    
    -- 添加 updated_at 列
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    END IF;
END $$;

-- 2. 创建其他必要的表（如果不存在）
CREATE TABLE IF NOT EXISTS admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT DEFAULT 'active',
  verified BOOLEAN DEFAULT false,
  max_events INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  qr_payload TEXT,
  status TEXT DEFAULT 'unused',
  used_at TIMESTAMPTZ,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_email TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 插入默认数据
INSERT INTO users (email, name, age, password_hash, role, is_active) 
VALUES (
  'admin@partytix.com',
  'Admin User',
  25,
  '$2b$10$9C1ympkGwmvLWuVtJtic6OhWpYewlZlUOe2Mdk97cg7SHYJkCpI9a',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

INSERT INTO admin_invite_codes (code, is_active, expires_at) 
VALUES (
  'WELCOME2024',
  true,
  '2025-12-31T23:59:59Z'
) ON CONFLICT (code) DO NOTHING;

-- 4. 创建基本索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_user_id ON merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

SELECT 'Online database fixed successfully!' as status;
