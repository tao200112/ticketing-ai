-- ========================================
-- 数据库重建 - 第二步：创建核心函数
-- ========================================

BEGIN;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建活动更新时间触发器函数
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建价格库存检查函数
CREATE OR REPLACE FUNCTION check_inventory_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sold_count > NEW.inventory THEN
        RAISE EXCEPTION 'Sold count cannot exceed inventory';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建活动参与人数检查函数
CREATE OR REPLACE FUNCTION check_event_attendees_constraint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_attendees IS NOT NULL AND NEW.current_attendees > NEW.max_attendees THEN
        RAISE EXCEPTION 'Current attendees cannot exceed max attendees';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第二步完成：所有核心函数已创建';
END $$;

