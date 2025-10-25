-- PartyTix RLS 策略修复版本
-- 修正了 merchants 表外键列名问题 (owner_user_id 而不是 user_id)
-- 在 Supabase SQL Editor 中执行此文件

-- ========================================
-- 启用 RLS (Row Level Security)
-- ========================================

-- 启用所有表的 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 删除现有策略（如果存在）
-- ========================================

-- 删除 users 表策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view and update own profile" ON users;

-- 删除 merchants 表策略
DROP POLICY IF EXISTS "Merchants can manage their own business" ON merchants;
DROP POLICY IF EXISTS "Verified merchants are publicly readable" ON merchants;
DROP POLICY IF EXISTS "Merchants can view own data" ON merchants;
DROP POLICY IF EXISTS "Merchants can update own data" ON merchants;

-- 删除 events 表策略
DROP POLICY IF EXISTS "Events are publicly readable when published" ON events;
DROP POLICY IF EXISTS "Merchants can manage their own events" ON events;
DROP POLICY IF EXISTS "Public events are viewable" ON events;

-- 删除 prices 表策略
DROP POLICY IF EXISTS "Prices are publicly readable when active" ON prices;
DROP POLICY IF EXISTS "Merchants can manage their event prices" ON prices;

-- 删除 orders 表策略
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;

-- 删除 tickets 表策略
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Merchants can view their tickets" ON tickets;

-- 删除 admin_invite_codes 表策略
DROP POLICY IF EXISTS "Admin invite codes are publicly readable" ON admin_invite_codes;

-- ========================================
-- Users 表 RLS 策略
-- ========================================

-- 用户可以查看和更新自己的信息
CREATE POLICY "Users can view and update own profile" ON users
    FOR ALL USING (id = auth.uid());

-- ========================================
-- Merchants 表 RLS 策略 (修复版本)
-- ========================================

-- 商家拥有者可以管理自己的商家信息
-- 修复：使用正确的列名 owner_user_id
CREATE POLICY "Merchants can manage their own business" ON merchants
    FOR ALL USING (owner_user_id = auth.uid());

-- 公开读取已验证的商家信息
CREATE POLICY "Verified merchants are publicly readable" ON merchants
    FOR SELECT USING (verified = true);

-- ========================================
-- Events 表 RLS 策略
-- ========================================

-- 公开读取已发布的活动
CREATE POLICY "Public events are viewable" ON events
    FOR SELECT USING (status = 'published');

-- 商家拥有者可以管理自己的活动
-- 修复：使用正确的列名 owner_user_id
CREATE POLICY "Merchants can manage their own events" ON events
    FOR ALL USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- ========================================
-- Prices 表 RLS 策略
-- ========================================

-- 公开读取活跃的价格
CREATE POLICY "Prices are publicly readable when active" ON prices
    FOR SELECT USING (is_active = true);

-- 商家拥有者可以管理自己活动的价格
-- 修复：使用正确的列名 owner_user_id
CREATE POLICY "Merchants can manage their event prices" ON prices
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN merchants m ON e.merchant_id = m.id
            WHERE m.owner_user_id = auth.uid()
        )
    );

-- ========================================
-- Orders 表 RLS 策略
-- ========================================

-- 用户可以查看自己的订单
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

-- 商家可以查看自己商家的订单
CREATE POLICY "Merchants can view their orders" ON orders
    FOR SELECT USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- ========================================
-- Tickets 表 RLS 策略
-- ========================================

-- 用户可以查看自己的票据
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (user_id = auth.uid());

-- 商家可以查看自己商家的票据
CREATE POLICY "Merchants can view their tickets" ON tickets
    FOR SELECT USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- ========================================
-- Admin Invite Codes 表 RLS 策略
-- ========================================

-- 邀请码公开可读（用于注册验证）
CREATE POLICY "Admin invite codes are publicly readable" ON admin_invite_codes
    FOR SELECT USING (is_active = true AND expires_at > NOW());

-- ========================================
-- 管理员权限策略
-- ========================================

-- 注意：以下策略需要管理员角色，可能需要额外的角色检查
-- 如果使用 Supabase Auth 的角色系统，请根据实际情况调整

-- 管理员可以查看所有用户
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 管理员可以查看所有商家
CREATE POLICY "Admins can view all merchants" ON merchants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 管理员可以查看所有活动
CREATE POLICY "Admins can view all events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 管理员可以查看所有订单
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 管理员可以查看所有票据
CREATE POLICY "Admins can view all tickets" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 完成提示
-- ========================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE 'PartyTix RLS 策略修复完成！';
    RAISE NOTICE '已修复 merchants 表外键列名问题 (owner_user_id)';
    RAISE NOTICE '所有表的 RLS 策略已启用';
    RAISE NOTICE '用户权限：用户可以管理自己的数据';
    RAISE NOTICE '商家权限：商家可以管理自己的业务数据';
    RAISE NOTICE '公开权限：已验证商家和已发布活动公开可读';
    RAISE NOTICE '管理员权限：管理员可以查看所有数据';
    RAISE NOTICE '请测试所有用户角色的权限是否正确工作';
END $$;
