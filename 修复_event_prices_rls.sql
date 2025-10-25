-- 修复 event_prices 表的 RLS 问题
-- 这个表可能是 prices 表的别名或视图，需要单独处理

-- ========================================
-- 1. 检查是否存在 event_prices 表
-- ========================================

-- 检查表是否存在
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('event_prices', 'prices')
ORDER BY table_name;

-- ========================================
-- 2. 如果 event_prices 是 prices 表的别名，启用 RLS
-- ========================================

-- 启用 prices 表的 RLS（如果尚未启用）
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- 如果 event_prices 是独立表，也启用其 RLS
DO $$
BEGIN
    -- 检查 event_prices 表是否存在
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_prices'
    ) THEN
        -- 启用 event_prices 表的 RLS
        ALTER TABLE event_prices ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '已启用 event_prices 表的 RLS';
    ELSE
        RAISE NOTICE 'event_prices 表不存在，跳过';
    END IF;
END $$;

-- ========================================
-- 3. 为 event_prices 表创建 RLS 策略（如果存在）
-- ========================================

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Event prices are publicly readable when active" ON event_prices;
DROP POLICY IF EXISTS "Merchants can manage their event prices" ON event_prices;

-- 为 event_prices 表创建策略（如果表存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_prices'
    ) THEN
        -- 公开读取活跃的价格
        EXECUTE 'CREATE POLICY "Event prices are publicly readable when active" ON event_prices
            FOR SELECT USING (is_active = true)';
        
        -- 商家拥有者可以管理自己活动的价格
        EXECUTE 'CREATE POLICY "Merchants can manage their event prices" ON event_prices
            FOR ALL USING (
                event_id IN (
                    SELECT e.id FROM events e
                    JOIN merchants m ON e.merchant_id = m.id
                    WHERE m.owner_user_id = auth.uid()
                )
            )';
        
        RAISE NOTICE '已为 event_prices 表创建 RLS 策略';
    ELSE
        RAISE NOTICE 'event_prices 表不存在，跳过策略创建';
    END IF;
END $$;

-- ========================================
-- 4. 确保 prices 表有正确的策略
-- ========================================

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Prices are publicly readable when active" ON prices;
DROP POLICY IF EXISTS "Merchants can manage their event prices" ON prices;

-- 重新创建 prices 表的策略
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

-- ========================================
-- 5. 检查所有表的 RLS 状态
-- ========================================

-- 检查所有相关表的 RLS 状态
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
    AND tablename IN ('users', 'merchants', 'events', 'prices', 'event_prices', 'orders', 'tickets', 'admin_invite_codes')
ORDER BY tablename;

-- ========================================
-- 6. 输出修复结果
-- ========================================

DO $$
DECLARE
    rls_count INTEGER;
    total_tables INTEGER;
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
    
    RAISE NOTICE 'RLS 修复完成！';
    RAISE NOTICE '总表数量: %', total_tables;
    RAISE NOTICE '启用 RLS 的表数量: %', rls_count;
    
    IF rls_count = total_tables THEN
        RAISE NOTICE '✅ 所有表的 RLS 已正确启用';
    ELSE
        RAISE NOTICE '⚠️ 部分表的 RLS 可能未启用，请检查上方的状态';
    END IF;
END $$;
