-- ========================================
-- 全面修复 RLS 策略 - 确保所有表都允许公开读取
-- 这是数据迁移的补充，专门解决 RLS 权限问题
-- ========================================

-- 1. 删除所有现有的公开读取策略（避免冲突）
DROP POLICY IF EXISTS "Allow public read access to events" ON events;
DROP POLICY IF EXISTS "Allow anonymous read events" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Allow public read access to published events" ON events;
DROP POLICY IF EXISTS "Allow public read access to prices" ON prices;
DROP POLICY IF EXISTS "Allow anonymous read prices" ON prices;
DROP POLICY IF EXISTS "Allow public read access to merchants" ON merchants;
DROP POLICY IF EXISTS "Allow anonymous read merchants" ON merchants;

-- 2. 为 events 表创建公开读取策略
CREATE POLICY "Allow public read access to events"
ON events FOR SELECT
TO public
USING (true);

-- 3. 为 prices 表创建公开读取策略
CREATE POLICY "Allow public read access to prices"
ON prices FOR SELECT
TO public
USING (true);

-- 4. 为 merchants 表创建公开读取策略（用于关联查询）
CREATE POLICY "Allow public read access to merchants"
ON merchants FOR SELECT
TO public
USING (true);

-- 5. 确保 RLS 已启用
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 6. 验证策略已创建
SELECT 
    'Policy verification' as check_type,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('events', 'prices', 'merchants')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- 7. 测试查询（应该返回所有事件）
SELECT 
    'Test query' as check_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'published') as published_events,
    COUNT(*) FILTER (WHERE status IS NULL) as null_status_events
FROM events;

