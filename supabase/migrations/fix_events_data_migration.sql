-- ========================================
-- 数据迁移：修复 events 表的数据问题
-- 确保所有事件都有正确的 status 值，并且可以正常访问
-- ========================================

-- 1. 确保 status 字段存在且有默认值
DO $$
BEGIN
    -- 检查 status 字段是否存在
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE events
        ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
    
    -- 确保 status 字段有 CHECK 约束
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'events'
        AND constraint_name = 'events_status_check'
    ) THEN
        ALTER TABLE events
        ADD CONSTRAINT events_status_check 
        CHECK (status IN ('draft', 'published', 'cancelled', 'completed') OR status IS NULL);
    END IF;
END $$;

-- 2. 更新所有 status 为 NULL 的事件为 'published'
UPDATE events
SET status = 'published'
WHERE status IS NULL;

-- 3. 确保所有事件都有必要的字段值
-- 如果 title 为空，设置为默认值
UPDATE events
SET title = COALESCE(title, 'Untitled Event ' || SUBSTRING(id::text, 1, 8))
WHERE title IS NULL OR title = '';

-- 4. 确保所有事件都有 created_at 时间戳
UPDATE events
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- 5. 创建或更新 RLS 策略，允许公开读取事件
-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow public read access to events" ON events;
DROP POLICY IF EXISTS "Allow anonymous read events" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;

-- 创建新的 RLS 策略：允许所有人读取所有事件（包括草稿，用于调试）
-- 如果只想允许已发布的事件，可以改为: USING (status = 'published' OR status IS NULL)
CREATE POLICY "Allow public read access to events"
ON events FOR SELECT
TO public
USING (true);

-- 6. 确保 RLS 已启用（如果之前被禁用）
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 7. 确保 prices 表的 RLS 策略允许公开读取
DROP POLICY IF EXISTS "Allow public read access to prices" ON prices;
CREATE POLICY "Allow public read access to prices"
ON prices FOR SELECT
TO public
USING (true);

-- 确保 prices 表的 RLS 已启用
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- 8. 确保 merchants 表的 RLS 策略允许公开读取（用于关联查询）
DROP POLICY IF EXISTS "Allow public read access to merchants" ON merchants;
CREATE POLICY "Allow public read access to merchants"
ON merchants FOR SELECT
TO public
USING (true);

-- 确保 merchants 表的 RLS 已启用
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 9. 创建索引以提升查询性能（如果不存在）
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON prices(event_id);

-- 10. 验证数据：显示所有事件的状态统计
DO $$
DECLARE
    total_events INTEGER;
    published_events INTEGER;
    draft_events INTEGER;
    null_status_events INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_events FROM events;
    SELECT COUNT(*) INTO published_events FROM events WHERE status = 'published';
    SELECT COUNT(*) INTO draft_events FROM events WHERE status = 'draft';
    SELECT COUNT(*) INTO null_status_events FROM events WHERE status IS NULL;
    
    RAISE NOTICE 'Event status summary:';
    RAISE NOTICE 'Total events: %', total_events;
    RAISE NOTICE 'Published: %', published_events;
    RAISE NOTICE 'Draft: %', draft_events;
    RAISE NOTICE 'Null status: %', null_status_events;
END $$;

-- 11. 输出迁移结果
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'published') as published_events,
    COUNT(*) FILTER (WHERE status IS NULL) as null_status_events
FROM events;

