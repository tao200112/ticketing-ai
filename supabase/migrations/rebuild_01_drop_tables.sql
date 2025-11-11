-- ========================================
-- 数据库重建 - 第一步：删除所有旧表和视图
-- ========================================
-- 执行此脚本会删除所有业务表和视图
-- 注意：不会删除 auth.users 表（Supabase 管理）
-- ========================================

BEGIN;

-- 禁用所有触发器
SET session_replication_role = 'replica';

-- 删除所有视图
DROP VIEW IF EXISTS events_overview CASCADE;
DROP VIEW IF EXISTS merchant_stats CASCADE;

-- 删除所有函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_activities_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_inventory_constraint() CASCADE;
DROP FUNCTION IF EXISTS check_event_attendees_constraint() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 删除所有表（按依赖顺序）
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS merchant_members CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS admin_invite_codes CASCADE;
DROP TABLE IF EXISTS email_verification_logs CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- 删除 public.users 表（如果存在，会在后续步骤中重建）
DROP TABLE IF EXISTS public.users CASCADE;

-- 删除可能存在的约束
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_email_role_unique CASCADE;

-- 重新启用触发器
SET session_replication_role = 'origin';

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第一步完成：所有旧表和视图已删除';
END $$;

