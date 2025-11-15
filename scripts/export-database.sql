-- ========================================
-- 导出数据库内容（用于备份）
-- ========================================
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 或者使用 pg_dump 命令导出

-- 1. 导出 merchants 表数据
COPY (
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
    FROM merchants
    ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- 2. 导出 admin_invite_codes 表数据（如果需要）
COPY (
    SELECT 
        id,
        code,
        is_active,
        used_by,
        used_at,
        expires_at,
        created_at,
        created_by,
        max_events
    FROM admin_invite_codes
    ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- 注意：在 Supabase Dashboard 中，COPY TO STDOUT 可能不可用
-- 建议使用 pg_dump 或 Supabase Dashboard 的导出功能

