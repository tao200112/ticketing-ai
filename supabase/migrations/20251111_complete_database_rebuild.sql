-- ========================================
-- 完整数据库重建脚本
-- 删除所有旧数据并重新构建干净的数据库
-- 执行前请确保已备份重要数据！
-- ========================================
-- 
-- 使用方法：
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制此脚本并执行
-- 3. 脚本会自动删除所有旧数据并重建数据库
--
-- 注意：此脚本会删除所有业务数据，但保留 auth.users 表（Supabase 管理）
-- ========================================

BEGIN;

-- ========================================
-- 第一步：删除所有依赖关系和表
-- ========================================

-- 禁用所有触发器
SET session_replication_role = 'replica';

-- 删除所有视图
DROP VIEW IF EXISTS events_overview CASCADE;
DROP VIEW IF EXISTS merchant_stats CASCADE;

-- 删除所有函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_activities_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_inventory_constraint() CASCADE;
DROP FUNCTION IF EXISTS check_event_attendees_constraint() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 删除所有表（按依赖顺序）
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS merchant_members CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS admin_invite_codes CASCADE;
DROP TABLE IF EXISTS email_verification_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- 注意：不删除 public.users 表，因为需要与 auth.users 同步
-- 但会清空数据（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        TRUNCATE TABLE public.users CASCADE;
    END IF;
END $$;

-- 重新启用触发器
SET session_replication_role = 'origin';

-- ========================================
-- 第二步：创建核心函数
-- ========================================

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建活动更新时间触发器函数
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 第三步：创建 users 表（如果不存在）
-- ========================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  age INTEGER,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_email_role_unique UNIQUE (email, role)
);

-- 创建 users 表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON public.users(email, role);

-- 创建 users 表更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第四步：创建商家表
-- ========================================

CREATE TABLE public.merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  max_events INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建商家表索引
CREATE INDEX idx_merchants_owner_user_id ON public.merchants(owner_user_id);
CREATE INDEX idx_merchants_status ON public.merchants(status);
CREATE INDEX idx_merchants_verified ON public.merchants(verified);

-- 创建商家表更新时间触发器
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第五步：创建商家成员表
-- ========================================

CREATE TABLE public.merchant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('boss', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, user_id)
);

-- 创建商家成员表索引
CREATE INDEX idx_merchant_members_merchant_id ON public.merchant_members(merchant_id);
CREATE INDEX idx_merchant_members_user_id ON public.merchant_members(user_id);
CREATE INDEX idx_merchant_members_role ON public.merchant_members(role);

-- 创建商家成员表更新时间触发器
DROP TRIGGER IF EXISTS update_merchant_members_updated_at ON public.merchant_members;
CREATE TRIGGER update_merchant_members_updated_at 
    BEFORE UPDATE ON public.merchant_members
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第六步：创建管理员邀请码表
-- ========================================

CREATE TABLE public.admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_events INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin'
);

-- 创建管理员邀请码表索引
CREATE INDEX idx_admin_invite_codes_code ON public.admin_invite_codes(code);
CREATE INDEX idx_admin_invite_codes_active ON public.admin_invite_codes(is_active, expires_at);

-- ========================================
-- 第七步：创建活动表
-- ========================================

CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
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
  sort_order INTEGER DEFAULT 999999,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建活动表索引
CREATE INDEX idx_events_merchant_id ON public.events(merchant_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start_at ON public.events(start_at);
CREATE INDEX idx_events_sort_order ON public.events(sort_order);

-- 创建活动表更新时间触发器
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第八步：创建价格表
-- ========================================

CREATE TABLE public.prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
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

-- 创建价格表索引
CREATE INDEX idx_prices_event_id ON public.prices(event_id);
CREATE INDEX idx_prices_is_active ON public.prices(is_active);

-- 创建价格表更新时间触发器
DROP TRIGGER IF EXISTS update_prices_updated_at ON public.prices;
CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON public.prices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第九步：创建订单表
-- ========================================

CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_age INTEGER,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建订单表索引
CREATE INDEX idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- 创建订单表更新时间触发器
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第十步：创建票据表
-- ========================================

CREATE TABLE public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tier TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  holder_name TEXT,
  holder_age INTEGER,
  short_id TEXT UNIQUE NOT NULL,
  qr_payload TEXT,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'refunded')),
  used_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建票据表索引
CREATE INDEX idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_short_id ON public.tickets(short_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_holder_name ON public.tickets(holder_name);
CREATE INDEX idx_tickets_holder_age ON public.tickets(holder_age);
CREATE INDEX idx_tickets_redeemed_by ON public.tickets(redeemed_by);
CREATE INDEX idx_tickets_redeemed_at ON public.tickets(redeemed_at);
CREATE INDEX idx_tickets_used_at ON public.tickets(used_at);

-- ========================================
-- 第十一步：创建活动内容表
-- ========================================

CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 999999,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建活动内容表索引
CREATE INDEX idx_activities_is_active ON public.activities(is_active);
CREATE INDEX idx_activities_created_at ON public.activities(created_at);
CREATE INDEX idx_activities_sort_order ON public.activities(sort_order);

-- 创建活动内容表更新时间触发器
DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- ========================================
-- 第十二步：创建联系消息表
-- ========================================

CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建联系消息表索引
CREATE INDEX idx_contact_messages_email ON public.contact_messages(email);
CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- 创建联系消息表更新时间触发器
DROP TRIGGER IF EXISTS update_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER update_contact_messages_updated_at 
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 第十三步：创建数据完整性约束函数
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
DROP TRIGGER IF EXISTS check_prices_inventory ON public.prices;
CREATE TRIGGER check_prices_inventory 
    BEFORE INSERT OR UPDATE ON public.prices
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
DROP TRIGGER IF EXISTS check_events_attendees ON public.events;
CREATE TRIGGER check_events_attendees 
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION check_event_attendees_constraint();

-- ========================================
-- 第十四步：创建用户同步触发器
-- ========================================

-- 创建用户同步触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_provider TEXT;
  v_email_verified_at TIMESTAMPTZ;
  v_result_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF v_role IS NULL OR v_role NOT IN ('user', 'merchant', 'admin') THEN
    v_role := 'user';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );

  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  v_email_verified_at := COALESCE(NEW.email_confirmed_at, NEW.confirmed_at);

  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    auth_provider,
    email_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_provider,
    v_email_verified_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (email, role) DO UPDATE
    SET
      id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW()
  RETURNING id INTO v_result_id;

  IF v_result_id = NEW.id THEN
    RAISE LOG 'handle_new_auth_user_to_users: inserted email=% role=% id=% provider=%', NEW.email, v_role, v_result_id, v_provider;
  ELSE
    RAISE LOG 'handle_new_auth_user_to_users: updated existing record for email=% role=% existing_id=% auth_id=% provider=%', NEW.email, v_role, v_result_id, NEW.id, v_provider;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_auth_user_to_users error email=% role=% id=% state=% message=%', NEW.email, v_role, NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- 创建用户同步触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 回填现有的 auth.users 数据到 public.users
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  auth_provider,
  email_verified_at,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    u.email
  ) as name,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', ''),
    'user'
  ) as role,
  COALESCE(
    u.raw_app_meta_data->>'provider',
    'email'
  ) as auth_provider,
  COALESCE(u.email_confirmed_at, u.confirmed_at) as email_verified_at,
  COALESCE(u.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users u
ON CONFLICT (email, role) DO UPDATE
  SET
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name),
    auth_provider = EXCLUDED.auth_provider,
    email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
    updated_at = NOW();

-- ========================================
-- 第十五步：创建视图
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
FROM public.events e
LEFT JOIN public.merchants m ON e.merchant_id = m.id
LEFT JOIN public.prices p ON e.id = p.event_id AND p.is_active = true
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
FROM public.merchants m
LEFT JOIN public.events e ON m.id = e.merchant_id
LEFT JOIN public.prices p ON e.id = p.event_id
GROUP BY m.id, m.name, m.verified;

-- ========================================
-- 第十六步：启用 RLS 并创建策略
-- ========================================

-- 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Users RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

-- 服务角色可以完全管理用户
CREATE POLICY "Allow service role to manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- 用户可以查看自己的资料
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的资料
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 允许公开注册（插入新用户）
CREATE POLICY "Allow public registration" ON public.users
  FOR INSERT WITH CHECK (true);

-- 认证用户可以看到用户数据（用于基本查找）
CREATE POLICY "Allow authenticated users to read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- ========================================
-- Merchants RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Merchants: Public read verified" ON public.merchants;
DROP POLICY IF EXISTS "Merchants: Owner can manage" ON public.merchants;
DROP POLICY IF EXISTS "Merchants: Service role can manage" ON public.merchants;

-- 公开读取已验证的商家
CREATE POLICY "Merchants: Public read verified" ON public.merchants
  FOR SELECT USING (verified = true AND status = 'active');

-- 商家拥有者可以管理自己的商家
CREATE POLICY "Merchants: Owner can manage" ON public.merchants
  FOR ALL USING (owner_user_id = auth.uid());

-- 服务角色可以管理所有商家
CREATE POLICY "Merchants: Service role can manage" ON public.merchants
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- Merchant Members RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Merchant Members: Access own membership" ON public.merchant_members;
DROP POLICY IF EXISTS "Merchant Members: Merchant owner can manage" ON public.merchant_members;

-- 用户可以查看自己的商家成员身份
CREATE POLICY "Merchant Members: Access own membership" ON public.merchant_members
  FOR SELECT USING (user_id = auth.uid());

-- 商家拥有者可以管理自己商家的成员
CREATE POLICY "Merchant Members: Merchant owner can manage" ON public.merchant_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = merchant_members.merchant_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- ========================================
-- Events RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Events: Public read published" ON public.events;
DROP POLICY IF EXISTS "Events: Access for merchant members and owners" ON public.events;

-- 公开读取已发布的活动
CREATE POLICY "Events: Public read published" ON public.events
  FOR SELECT USING (status = 'published');

-- 商家成员和拥有者可以访问自己的活动
CREATE POLICY "Events: Access for merchant members and owners" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.merchant_members mm
      WHERE mm.merchant_id = events.merchant_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = events.merchant_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- ========================================
-- Prices RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Prices: Public read active" ON public.prices;
DROP POLICY IF EXISTS "Prices: Merchant can manage" ON public.prices;

-- 公开读取活跃的价格
CREATE POLICY "Prices: Public read active" ON public.prices
  FOR SELECT USING (is_active = true);

-- 商家可以管理自己活动的价格
CREATE POLICY "Prices: Merchant can manage" ON public.prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE e.id = prices.event_id
      AND (m.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.merchant_members mm
        WHERE mm.merchant_id = m.id
        AND mm.user_id = auth.uid()
      ))
    )
  );

-- ========================================
-- Orders RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Orders: Access for merchant members and owners" ON public.orders;
DROP POLICY IF EXISTS "Orders: User can view own" ON public.orders;

-- 商家成员和拥有者可以访问自己商家的订单
CREATE POLICY "Orders: Access for merchant members and owners" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.events e ON t.event_id = e.id
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE t.order_id = orders.id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.events e ON t.event_id = e.id
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE t.order_id = orders.id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 用户可以查看自己的订单
CREATE POLICY "Orders: User can view own" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR customer_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- ========================================
-- Tickets RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Tickets: Access for merchant members and owners" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: Update for merchant members and owners" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: User can view own" ON public.tickets;

-- 商家成员和拥有者可以访问自己商家的票据
CREATE POLICY "Tickets: Access for merchant members and owners" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 商家成员和拥有者可以更新自己商家的票据（用于兑换）
CREATE POLICY "Tickets: Update for merchant members and owners" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 用户可以查看自己的票据
CREATE POLICY "Tickets: User can view own" ON public.tickets
  FOR SELECT USING (user_id = auth.uid() OR holder_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- ========================================
-- Activities RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Activities: Public read active" ON public.activities;
DROP POLICY IF EXISTS "Activities: Admin can manage" ON public.activities;

-- 公开读取活跃的活动内容
CREATE POLICY "Activities: Public read active" ON public.activities
  FOR SELECT USING (is_active = true);

-- 管理员可以管理活动内容（需要 service_role 或 admin 角色）
CREATE POLICY "Activities: Admin can manage" ON public.activities
  FOR ALL USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ========================================
-- Contact Messages RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Contact Messages: Anyone can create" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact Messages: Admin can view" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact Messages: Admin can update" ON public.contact_messages;

-- 任何人都可以创建联系消息
CREATE POLICY "Contact Messages: Anyone can create" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- 管理员可以查看所有联系消息
CREATE POLICY "Contact Messages: Admin can view" ON public.contact_messages
  FOR SELECT USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- 管理员可以更新联系消息状态
CREATE POLICY "Contact Messages: Admin can update" ON public.contact_messages
  FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ========================================
-- Admin Invite Codes RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Admin Invite Codes: Public can read active" ON public.admin_invite_codes;
DROP POLICY IF EXISTS "Admin Invite Codes: Admin can manage" ON public.admin_invite_codes;

-- 公开可以读取活跃的邀请码
CREATE POLICY "Admin Invite Codes: Public can read active" ON public.admin_invite_codes
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- 管理员可以管理邀请码
CREATE POLICY "Admin Invite Codes: Admin can manage" ON public.admin_invite_codes
  FOR ALL USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ========================================
-- 第十七步：设置权限
-- ========================================

-- 授予服务角色所有权限
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.merchants TO service_role;
GRANT ALL ON public.merchant_members TO service_role;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.prices TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.activities TO service_role;
GRANT ALL ON public.contact_messages TO service_role;
GRANT ALL ON public.admin_invite_codes TO service_role;

-- 授予认证用户基本权限
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.merchants TO authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.prices TO authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.activities TO authenticated;
GRANT INSERT ON public.contact_messages TO authenticated;

-- 授予匿名用户基本权限
GRANT INSERT ON public.users TO anon;
GRANT SELECT ON public.merchants TO anon;
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.prices TO anon;
GRANT SELECT ON public.activities TO anon;
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT ON public.admin_invite_codes TO anon;

COMMIT;

-- ========================================
-- 完成提示
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ 数据库重建完成！';
    RAISE NOTICE '📊 已创建的表：';
    RAISE NOTICE '   - users (与 auth.users 同步)';
    RAISE NOTICE '   - merchants';
    RAISE NOTICE '   - merchant_members';
    RAISE NOTICE '   - admin_invite_codes';
    RAISE NOTICE '   - events';
    RAISE NOTICE '   - prices';
    RAISE NOTICE '   - orders';
    RAISE NOTICE '   - tickets';
    RAISE NOTICE '   - activities';
    RAISE NOTICE '   - contact_messages';
    RAISE NOTICE '🔒 已启用 RLS 并设置安全策略';
    RAISE NOTICE '🔧 已创建所有触发器和约束';
    RAISE NOTICE '📈 已创建视图：events_overview, merchant_stats';
    RAISE NOTICE '✨ 数据库已准备好使用！';
END $$;

