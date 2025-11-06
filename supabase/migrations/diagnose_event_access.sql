-- ========================================
-- 完整诊断脚本：检查事件访问问题
-- 替换 YOUR_EVENT_ID_HERE 为实际的事件 ID
-- ========================================

-- 事件 ID（替换为实际值）
-- 例如: '62c7b850-1a67-466d-9bca-6ab72414ea65'
DO $$
DECLARE
    event_id_to_check UUID := 'YOUR_EVENT_ID_HERE'::UUID;  -- 替换为实际的事件 ID
BEGIN
    RAISE NOTICE '=== 诊断开始: 事件 ID = % ===', event_id_to_check;
END $$;

-- 1. 检查事件基本信息
SELECT 
    'Events table check' as check_type,
    id,
    title,
    status,
    merchant_id,
    created_at
FROM events
WHERE id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
LIMIT 1;

-- 2. 检查该事件是否有 prices
SELECT 
    'Prices check' as check_type,
    COUNT(*) as price_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_prices
FROM prices
WHERE event_id = 'YOUR_EVENT_ID_HERE';  -- 替换为实际的事件 ID

-- 3. 检查该事件的商家是否存在
SELECT 
    'Merchant check' as check_type,
    e.id as event_id,
    e.merchant_id,
    m.id as merchant_exists,
    m.name as merchant_name,
    CASE 
        WHEN m.id IS NULL THEN 'Merchant not found'
        ELSE 'Merchant exists'
    END as merchant_status
FROM events e
LEFT JOIN merchants m ON m.id = e.merchant_id
WHERE e.id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
LIMIT 1;

-- 4. 测试完整查询（模拟 API 查询）
SELECT 
    'Full query test' as check_type,
    e.id,
    e.title,
    e.status,
    COUNT(DISTINCT p.id) as prices_count,
    COUNT(DISTINCT m.id) as merchant_exists
FROM events e
LEFT JOIN prices p ON p.event_id = e.id AND p.is_active = true
LEFT JOIN merchants m ON m.id = e.merchant_id
WHERE e.id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
GROUP BY e.id, e.title, e.status;

-- 5. 检查 RLS 策略（events 表）
SELECT 
    'RLS Policies - Events' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- 6. 检查 RLS 策略（prices 表）
SELECT 
    'RLS Policies - Prices' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'prices'
ORDER BY policyname;

-- 7. 检查 RLS 策略（merchants 表）
SELECT 
    'RLS Policies - Merchants' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'merchants'
ORDER BY policyname;

-- 8. 检查 RLS 是否启用
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'prices', 'merchants')
ORDER BY tablename;

-- 9. 测试匿名用户查询（模拟公开访问）
-- 注意：这需要在 Supabase Dashboard 中以匿名角色运行
SET ROLE anon;
SELECT 
    'Anonymous access test' as check_type,
    id,
    title,
    status
FROM events
WHERE id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
LIMIT 1;
RESET ROLE;

-- 10. 检查 prices 表详情（注意：如果 ticket_kind 列不存在，会报错）
-- 先检查 ticket_kind 列是否存在
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'prices'
        AND column_name = 'ticket_kind'
    ) THEN
        RAISE NOTICE 'ticket_kind column EXISTS in prices table';
    ELSE
        RAISE NOTICE 'ticket_kind column DOES NOT EXIST in prices table - need to run migration';
    END IF;
END $$;

-- 查询价格详情（不包含 ticket_kind，避免错误）
SELECT 
    'Price details' as check_type,
    p.id,
    p.event_id,
    p.name,
    p.amount_cents,
    p.inventory,
    p.is_active,
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'prices'
            AND column_name = 'ticket_kind'
        ) THEN 'ticket_kind column exists (not shown in this query)'
        ELSE 'ticket_kind column does not exist'
    END as ticket_kind_status
FROM prices p
WHERE p.event_id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
ORDER BY p.created_at DESC;

