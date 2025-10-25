-- 完整的 RLS 修复脚本
-- 解决所有 RLS 相关问题，包括 event_prices 表

-- ========================================
-- 1. 检查所有表的存在性和 RLS 状态
-- ========================================

-- 显示所有相关表的状态
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ 已启用'
        ELSE '❌ 未启用'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'merchants', 'events', 'prices', 'event_prices', 
        'orders', 'tickets', 'admin_invite_codes'
    )
ORDER BY tablename;

-- ========================================
-- 2. 强制启用所有表的 RLS
-- ========================================

-- 启用所有相关表的 RLS
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. 清理所有现有策略
-- ========================================

-- 删除所有可能存在的策略
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- 获取所有策略并删除
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
    
    RAISE NOTICE '已清理所有现有策略';
END $$;

-- ========================================
-- 4. 重新创建所有 RLS 策略
-- ========================================

-- Users 表策略
CREATE POLICY "Users can view and update own profile" ON users
    FOR ALL USING (id = auth.uid());

-- Merchants 表策略
CREATE POLICY "Merchants can manage their own business" ON merchants
    FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "Verified merchants are publicly readable" ON merchants
    FOR SELECT USING (verified = true);

-- Events 表策略
CREATE POLICY "Public events are viewable" ON events
    FOR SELECT USING (status = 'published');

CREATE POLICY "Merchants can manage their own events" ON events
    FOR ALL USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- Prices 表策略
CREATE POLICY "Prices are publicly readable when active" ON prices
    FOR SELECT USING (is_active = true);

CREATE POLICY "Merchants can manage their event prices" ON prices
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN merchants m ON e.merchant_id = m.id
            WHERE m.owner_user_id = auth.uid()
        )
    );

-- Event_prices 表策略（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_prices'
    ) THEN
        EXECUTE 'CREATE POLICY "Event prices are publicly readable when active" ON event_prices
            FOR SELECT USING (is_active = true)';
        
        EXECUTE 'CREATE POLICY "Merchants can manage their event prices" ON event_prices
            FOR ALL USING (
                event_id IN (
                    SELECT e.id FROM events e
                    JOIN merchants m ON e.merchant_id = m.id
                    WHERE m.owner_user_id = auth.uid()
                )
            )';
        
        RAISE NOTICE '已为 event_prices 表创建策略';
    END IF;
END $$;

-- Orders 表策略
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Merchants can view their orders" ON orders
    FOR SELECT USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- Tickets 表策略
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Merchants can view their tickets" ON tickets
    FOR SELECT USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );

-- Admin invite codes 表策略
CREATE POLICY "Admin invite codes are publicly readable" ON admin_invite_codes
    FOR SELECT USING (is_active = true AND expires_at > NOW());

-- ========================================
-- 5. 管理员权限策略
-- ========================================

-- 管理员可以查看所有数据
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all merchants" ON merchants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all prices" ON prices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all tickets" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 6. 最终验证
-- ========================================

-- 检查所有表的 RLS 状态
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ 已启用'
        ELSE '❌ 未启用'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'merchants', 'events', 'prices', 'event_prices', 
        'orders', 'tickets', 'admin_invite_codes'
    )
ORDER BY tablename;

-- 检查创建的策略数量
SELECT 
    COUNT(*) as total_policies,
    COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- ========================================
-- 7. 输出完成信息
-- ========================================

DO $$
DECLARE
    rls_count INTEGER;
    total_tables INTEGER;
    policy_count INTEGER;
BEGIN
    -- 统计启用 RLS 的表数量
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND tablename IN ('users', 'merchants', 'events', 'prices', 'event_prices', 'orders', 'tickets', 'admin_invite_codes')
        AND rowsecurity = true;
    
    -- 统计总表数量
    SELECT COUNT(*) INTO total_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND tablename IN ('users', 'merchants', 'events', 'prices', 'event_prices', 'orders', 'tickets', 'admin_invite_codes');
    
    -- 统计策略数量
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '🎉 完整 RLS 修复完成！';
    RAISE NOTICE '总表数量: %', total_tables;
    RAISE NOTICE '启用 RLS 的表数量: %', rls_count;
    RAISE NOTICE '创建的策略数量: %', policy_count;
    
    IF rls_count = total_tables THEN
        RAISE NOTICE '✅ 所有表的 RLS 已正确启用';
    ELSE
        RAISE NOTICE '⚠️ 部分表的 RLS 可能未启用';
    END IF;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ RLS 策略已创建';
    ELSE
        RAISE NOTICE '⚠️ 未找到 RLS 策略';
    END IF;
    
    RAISE NOTICE '请检查上方的查询结果以确认所有设置正确';
END $$;
