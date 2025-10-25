# 数据库设置指南

## 🎯 下一步：在Supabase中设置数据库表

您的Supabase环境变量已配置完成！现在需要在Supabase Dashboard中创建数据库表结构。

### 📋 步骤 1: 访问Supabase Dashboard

1. 打开浏览器，访问: https://supabase.com/dashboard
2. 登录您的账户
3. 找到项目: `htaqcvnyipiqdbmvvfvj`

### 📋 步骤 2: 打开SQL Editor

1. 在左侧菜单中，点击 **SQL Editor**
2. 点击 **New query** 按钮

### 📋 步骤 3: 执行数据库脚本

1. 复制以下SQL脚本的全部内容：

```sql
-- PartyTix 真实数据库设置
-- 此脚本将创建表结构并插入一些基础数据用于测试

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
-- 3. 设置行级安全策略 (RLS)
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
-- 4. 插入示例数据
-- ========================================

-- 插入管理员用户
INSERT INTO users (email, name, age, password_hash, role) VALUES
('admin@partytix.com', 'System Administrator', 30, '$2a$10$dummy.hash.for.admin', 'admin');

-- 插入普通用户
INSERT INTO users (email, name, age, password_hash, role) VALUES
('john@example.com', 'John Smith', 25, '$2a$10$dummy.hash.for.user', 'user'),
('jane@example.com', 'Jane Doe', 28, '$2a$10$dummy.hash.for.user', 'user');

-- 插入商家用户
INSERT INTO users (email, name, age, password_hash, role) VALUES
('merchant1@example.com', 'Event Organizer', 35, '$2a$10$dummy.hash.for.merchant', 'merchant'),
('merchant2@example.com', 'Concert Manager', 32, '$2a$10$dummy.hash.for.merchant', 'merchant');

-- 插入商家信息
INSERT INTO merchants (owner_user_id, name, contact_email, contact_phone, status, verified, max_events) 
SELECT u.id, 'Music Events Co.', 'merchant1@example.com', '+1-555-0101', 'active', true, 20
FROM users u WHERE u.email = 'merchant1@example.com';

INSERT INTO merchants (owner_user_id, name, contact_email, contact_phone, status, verified, max_events) 
SELECT u.id, 'Concert Hall', 'merchant2@example.com', '+1-555-0102', 'active', true, 15
FROM users u WHERE u.email = 'merchant2@example.com';

-- 插入活动
INSERT INTO events (merchant_id, title, description, start_date, end_date, location, max_attendees, status)
SELECT m.id, 'Summer Music Festival', 'A three-day music festival featuring top artists', 
       '2024-07-15T18:00:00Z', '2024-07-17T23:00:00Z', 'Central Park, New York', 5000, 'active'
FROM merchants m WHERE m.name = 'Music Events Co.';

INSERT INTO events (merchant_id, title, description, start_date, end_date, location, max_attendees, status)
SELECT m.id, 'Jazz Night', 'An intimate jazz performance in a cozy venue',
       '2024-06-20T20:00:00Z', '2024-06-20T23:00:00Z', 'Blue Note Jazz Club', 200, 'active'
FROM merchants m WHERE m.name = 'Concert Hall';

-- 插入邀请码
INSERT INTO admin_invite_codes (code, is_active, expires_at) VALUES
('ADMIN_INV_2024_001', true, '2024-12-31T23:59:59Z'),
('ADMIN_INV_2024_002', true, '2024-12-31T23:59:59Z');

-- ========================================
-- 5. 验证数据
-- ========================================

-- 显示创建的表
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'merchants', 'events', 'tickets', 'orders', 'admin_invite_codes', 'ticket_types')
ORDER BY tablename;

-- 检查数据插入情况
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Merchants', COUNT(*) FROM merchants
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Invite Codes', COUNT(*) FROM admin_invite_codes;
```

2. 粘贴到SQL Editor中
3. 点击 **Run** 按钮执行脚本
4. 等待执行完成（约30秒）

### 📋 步骤 4: 验证设置

执行完成后，您应该看到：
- 7个表已创建
- 示例数据已插入
- 数据统计显示正确的记录数

### 📋 步骤 5: 重启应用程序

1. 停止当前的开发服务器（Ctrl+C）
2. 重新启动：
```bash
npm run dev
```

### 📋 步骤 6: 测试真实数据

1. 访问: http://localhost:3000/admin/dashboard
2. 检查是否显示真实数据（不是示例数据）
3. 尝试创建新活动，应该能保存到数据库

## 🎉 完成！

配置完成后，管理员界面将显示：
- **真实用户数据**：从Supabase数据库获取
- **真实商家数据**：从Supabase数据库获取  
- **真实活动数据**：从Supabase数据库获取
- **真实邀请码**：从Supabase数据库获取

所有数据都将持久化保存到您的Supabase数据库中！
