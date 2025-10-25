-- ========================================
-- PR-7: RLS 状态值对齐补丁
-- ========================================
-- 功能：确保 RLS 策略与数据库中的实际状态值对齐
-- 支持：events.status = 'published' 或 'active'
-- 支持：prices.is_active = true 且有效期检查

BEGIN;

-- 1. 更新事件策略以支持多种状态值
DROP POLICY IF EXISTS "events_select_published" ON events;

CREATE POLICY "events_select_published"
  ON events FOR SELECT
  USING (status IN ('published', 'active'));

-- 2. 更新价格策略以支持有效期检查
DROP POLICY IF EXISTS "prices_select_active" ON prices;

CREATE POLICY "prices_select_active"
  ON prices FOR SELECT
  USING (
    is_active = TRUE 
    AND event_id IN (SELECT id FROM events WHERE status IN ('published', 'active'))
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_to IS NULL OR valid_to >= NOW())
  );

-- 3. 确保事件表有正确的状态值
-- 将 'active' 状态统一为 'published'
UPDATE events 
SET status = 'published' 
WHERE status = 'active';

-- 4. 确保价格表有正确的活跃状态
-- 将 is_active = true 的价格标记为活跃
UPDATE prices 
SET is_active = TRUE 
WHERE is_active IS NULL OR is_active = FALSE;

-- 5. 为价格表添加有效期字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'valid_from') THEN
        ALTER TABLE prices ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prices' AND column_name = 'valid_to') THEN
        ALTER TABLE prices ADD COLUMN valid_to TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. 设置默认有效期（从现在到一年后）
UPDATE prices 
SET 
  valid_from = COALESCE(valid_from, NOW()),
  valid_to = COALESCE(valid_to, NOW() + INTERVAL '1 year')
WHERE valid_from IS NULL OR valid_to IS NULL;

COMMIT;
