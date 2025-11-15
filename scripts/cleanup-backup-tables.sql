-- ========================================
-- 清理备份表
-- ========================================
-- 此脚本只删除备份表，不影响正在使用的表
-- 执行前请确认备份表不再需要

BEGIN;

-- ========================================
-- 删除备份表
-- ========================================
-- 这些是迁移过程中创建的备份表，迁移完成后可以安全删除

DROP TABLE IF EXISTS merchants_backup_20250116 CASCADE;

-- 如果有其他备份表，可以在这里添加
-- DROP TABLE IF EXISTS merchants_backup_YYYYMMDD CASCADE;

-- ========================================
-- 验证删除结果
-- ========================================
DO $$
DECLARE
    backup_tables TEXT[];
    table_name TEXT;
BEGIN
    -- 查找所有备份表
    SELECT ARRAY_AGG(table_name) INTO backup_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%backup%' OR table_name LIKE '%_backup_%');
    
    IF backup_tables IS NOT NULL AND array_length(backup_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️  发现以下备份表仍存在:';
        FOREACH table_name IN ARRAY backup_tables
        LOOP
            RAISE NOTICE '  - %', table_name;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ 所有备份表已清理';
    END IF;
END $$;

COMMIT;

-- ========================================
-- 说明
-- ========================================
-- 此脚本只删除备份表，不会删除以下正在使用的表：
-- - users（用户）
-- - merchants（商家）
-- - events（活动）
-- - orders（订单）
-- - tickets（票）
-- - prices（价格）
-- - admin_invite_codes（邀请码）
-- - merchant_members（商家成员）
-- - ticket_redemptions（票务核销）
-- - activities（活动内容）
-- - contact_messages（联系消息）

