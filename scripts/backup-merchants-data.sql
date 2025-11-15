-- ========================================
-- 备份 merchants 表数据
-- ========================================
-- 在迁移之前，先运行此脚本备份数据

-- 创建备份表
CREATE TABLE IF NOT EXISTS merchants_backup_20250116 AS
SELECT 
    id,
    owner_user_id,
    owner_supabase_uid,
    name,
    contact_email,
    contact_phone,
    status,
    verified,
    max_events,
    created_at,
    updated_at
FROM merchants;

-- 验证备份
SELECT 
    COUNT(*) as backup_count,
    COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as has_email_count
FROM merchants_backup_20250116;

-- 显示备份的前几条记录
SELECT * FROM merchants_backup_20250116 LIMIT 5;

