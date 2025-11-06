-- ========================================
-- 检查事件是否存在的诊断脚本
-- 替换下面的事件 ID 为实际要检查的 ID
-- ========================================

-- 替换为实际的事件 ID
-- 例如: '62c7b850-1a67-466d-9bca-6ab72414ea65'
\set event_id '62c7b850-1a67-466d-9bca-6ab72414ea65'

-- 1. 列出所有事件（查看数据库中有哪些事件）
SELECT 
    id,
    title,
    status,
    merchant_id,
    created_at
FROM events
ORDER BY created_at DESC
LIMIT 10;

-- 2. 检查特定事件是否存在（替换 YOUR_EVENT_ID_HERE 为实际 ID）
SELECT 
    id,
    title,
    status,
    merchant_id,
    created_at,
    updated_at
FROM events
WHERE id = 'YOUR_EVENT_ID_HERE';  -- 替换为实际的事件 ID，例如: '62c7b850-1a67-466d-9bca-6ab72414ea65'

-- 3. 检查该事件的价格（替换 YOUR_EVENT_ID_HERE）
-- 注意：如果 ticket_kind 列不存在，移除下面的 ticket_kind 行
SELECT 
    id,
    event_id,
    name,
    amount_cents,
    inventory,
    is_active
    -- ticket_kind,  -- 如果列不存在，取消这行的注释
FROM prices
WHERE event_id = 'YOUR_EVENT_ID_HERE';  -- 替换为实际的事件 ID

-- 4. 检查该事件的商家信息（替换 YOUR_EVENT_ID_HERE）
SELECT 
    e.id as event_id,
    e.title,
    e.merchant_id,
    m.id as merchant_exists,
    m.name as merchant_name
FROM events e
LEFT JOIN merchants m ON m.id = e.merchant_id
WHERE e.id = 'YOUR_EVENT_ID_HERE';  -- 替换为实际的事件 ID

-- 4. 检查 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('events', 'prices', 'merchants')
ORDER BY tablename, policyname;

-- 5. 检查 RLS 是否启用
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'prices', 'merchants');

-- 6. 测试查询（模拟 API 查询，不包含 ticket_kind 以避免错误）
SELECT 
    e.*,
    json_agg(
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'amount_cents', p.amount_cents,
            'inventory', p.inventory
            -- 'ticket_kind', p.ticket_kind  -- 如果列不存在，取消这行的注释
        )
    ) FILTER (WHERE p.id IS NOT NULL) as prices,
    json_build_object(
        'id', m.id,
        'name', m.name,
        'contact_email', m.contact_email
    ) as merchants
FROM events e
LEFT JOIN prices p ON p.event_id = e.id
LEFT JOIN merchants m ON m.id = e.merchant_id
WHERE e.id = 'YOUR_EVENT_ID_HERE'  -- 替换为实际的事件 ID
GROUP BY e.id, m.id, m.name, m.contact_email;

