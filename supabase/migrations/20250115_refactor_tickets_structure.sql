-- ========================================
-- 重构 Tickets 表结构：合并 snapshot 字段为 JSONB
-- 迁移日期：2025-01-15
-- 目标：简化表结构，提高可维护性
-- ========================================

-- ========================================
-- Step 1: 添加新的 JSONB 字段
-- ========================================

-- Event snapshot JSONB
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_snapshot JSONB;
COMMENT ON COLUMN tickets.event_snapshot IS 'Event data snapshot at ticket creation time (replaces event_*_snapshot fields)';

-- Price snapshot JSONB
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price_snapshot JSONB;
COMMENT ON COLUMN tickets.price_snapshot IS 'Price data snapshot at ticket creation time (replaces price_*_snapshot fields)';

-- ========================================
-- Step 2: 迁移现有数据到 JSONB 字段
-- ========================================

-- 迁移 event snapshot 数据
UPDATE tickets
SET event_snapshot = jsonb_build_object(
  'title', event_title_snapshot,
  'description', event_description_snapshot,
  'venue', event_venue_snapshot,
  'address', event_address_snapshot,
  'poster_url', event_poster_url_snapshot,
  'start_at', event_start_at_snapshot,
  'end_at', event_end_at_snapshot
)
WHERE event_snapshot IS NULL
  AND (
    event_title_snapshot IS NOT NULL
    OR event_description_snapshot IS NOT NULL
    OR event_venue_snapshot IS NOT NULL
    OR event_address_snapshot IS NOT NULL
    OR event_poster_url_snapshot IS NOT NULL
    OR event_start_at_snapshot IS NOT NULL
    OR event_end_at_snapshot IS NOT NULL
  );

-- 迁移 price snapshot 数据
UPDATE tickets
SET price_snapshot = jsonb_build_object(
  'name', price_name_snapshot,
  'amount_cents', price_amount_cents_snapshot,
  'currency', price_currency_snapshot
)
WHERE price_snapshot IS NULL
  AND (
    price_name_snapshot IS NOT NULL
    OR price_amount_cents_snapshot IS NOT NULL
    OR price_currency_snapshot IS NOT NULL
  );

-- ========================================
-- Step 3: 标记旧字段为废弃（添加注释）
-- ========================================

COMMENT ON COLUMN tickets.event_title_snapshot IS 'DEPRECATED: Use event_snapshot->>title instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_description_snapshot IS 'DEPRECATED: Use event_snapshot->>description instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_venue_snapshot IS 'DEPRECATED: Use event_snapshot->>venue instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_address_snapshot IS 'DEPRECATED: Use event_snapshot->>address instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_poster_url_snapshot IS 'DEPRECATED: Use event_snapshot->>poster_url instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_start_at_snapshot IS 'DEPRECATED: Use event_snapshot->>start_at instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_end_at_snapshot IS 'DEPRECATED: Use event_snapshot->>end_at instead. Kept for backward compatibility.';

COMMENT ON COLUMN tickets.price_name_snapshot IS 'DEPRECATED: Use price_snapshot->>name instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.price_amount_cents_snapshot IS 'DEPRECATED: Use price_snapshot->>amount_cents instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.price_currency_snapshot IS 'DEPRECATED: Use price_snapshot->>currency instead. Kept for backward compatibility.';

-- ========================================
-- Step 4: 标记 status 字段为废弃（如果与 used 重复）
-- ========================================

-- 检查 status 和 used 字段的一致性
DO $$
BEGIN
  -- 如果 status = 'used' 但 used = false，修复数据
  UPDATE tickets
  SET used = true, used_at = COALESCE(used_at, NOW())
  WHERE status = 'used' AND used = false;
  
  -- 如果 used = true 但 status != 'used'，修复数据
  UPDATE tickets
  SET status = 'used'
  WHERE used = true AND status != 'used';
  
  RAISE NOTICE 'Synchronized status and used fields';
END $$;

COMMENT ON COLUMN tickets.status IS 'DEPRECATED: Use used field instead. Kept for backward compatibility. Status: unused=used=false, used=used=true, revoked=used=true with special flag.';

-- ========================================
-- Step 5: 创建 JSONB 索引（如果需要）
-- ========================================

-- 为 event_snapshot 创建 GIN 索引（支持 JSONB 查询）
CREATE INDEX IF NOT EXISTS idx_tickets_event_snapshot ON tickets USING GIN (event_snapshot);

-- 为 price_snapshot 创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_tickets_price_snapshot ON tickets USING GIN (price_snapshot);

-- ========================================
-- 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tickets Table Refactoring Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New JSONB fields: event_snapshot, price_snapshot';
  RAISE NOTICE 'Old snapshot fields are marked as DEPRECATED';
  RAISE NOTICE 'Next: Run ENUM migration for status fields';
  RAISE NOTICE '========================================';
END $$;

