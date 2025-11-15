-- ========================================
-- 清理不需要的表
-- ========================================
-- ⚠️ 警告：执行前请先运行 check-table-usage.sql 确认表的使用情况
-- ⚠️ 此脚本会删除表及其所有数据，无法恢复！

BEGIN;

-- ========================================
-- 1. 删除备份表（迁移完成后可以删除）
-- ========================================
DROP TABLE IF EXISTS merchants_backup_20250116 CASCADE;

-- ========================================
-- 2. 删除可能不需要的表
-- ========================================
-- 注意：如果这些表正在被使用，删除会失败
-- 请根据实际情况取消注释

-- 删除 activities 表（如果存在且不使用）
-- DROP TABLE IF EXISTS activities CASCADE;

-- 删除 contact_messages 表（如果存在且不使用）
-- DROP TABLE IF EXISTS contact_messages CASCADE;

-- ========================================
-- 3. 验证删除结果
-- ========================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '当前共有 % 个表', table_count;
END $$;

COMMIT;

-- ========================================
-- 回滚说明
-- ========================================
-- 如果删除出错，可以使用 ROLLBACK; 回滚
-- 但 CASCADE 删除的表无法恢复

