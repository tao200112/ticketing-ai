-- ========================================
-- 验证脚本：检查事件是否可正常访问
-- 执行迁移后运行此脚本验证结果
-- ========================================

-- 1. 检查所有事件的状态
SELECT 
    id,
    title,
    status,
    created_at,
    merchant_id
FROM events
ORDER BY created_at DESC;

-- 2. 检查 RLS 策略是否已创建
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

-- 3. 检查 RLS 是否启用
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'prices', 'merchants');

-- 4. 测试查询（模拟 API 查询）
SELECT 
    e.id,
    e.title,
    e.status,
    COUNT(p.id) as price_count,
    COUNT(m.id) as merchant_exists
FROM events e
LEFT JOIN prices p ON p.event_id = e.id
LEFT JOIN merchants m ON m.id = e.merchant_id
GROUP BY e.id, e.title, e.status;

-- 5. 检查特定事件 ID（替换为实际的事件 ID）
-- SELECT 
--     e.*,
--     json_agg(DISTINCT jsonb_build_object(
--         'id', p.id,
--         'name', p.name,
--         'amount_cents', p.amount_cents
--     )) as prices,
--     json_build_object(
--         'id', m.id,
--         'name', m.name
--     ) as merchant
-- FROM events e
-- LEFT JOIN prices p ON p.event_id = e.id
-- LEFT JOIN merchants m ON m.id = e.merchant_id
-- WHERE e.id = 'e68e28a0-9e16-4ac6-8154-7b5bd74f2d9a'  -- 替换为实际的事件 ID
-- GROUP BY e.id, m.id, m.name;

