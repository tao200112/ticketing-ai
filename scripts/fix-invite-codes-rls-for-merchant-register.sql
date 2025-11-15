-- ========================================
-- 修复 admin_invite_codes 表的 RLS 策略
-- 允许商家注册时验证邀请码
-- ========================================

-- 确保表存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_invite_codes'
    ) THEN
        RAISE EXCEPTION 'admin_invite_codes 表不存在';
    END IF;
END $$;

-- 启用 RLS（如果未启用）
ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- 删除可能阻止查询的策略
DROP POLICY IF EXISTS "Allow public read access to active invite codes" ON admin_invite_codes;
DROP POLICY IF EXISTS "Allow service role to manage invite codes" ON admin_invite_codes;
DROP POLICY IF EXISTS "Allow admin to manage invite codes" ON admin_invite_codes;
DROP POLICY IF EXISTS "Allow authenticated read" ON admin_invite_codes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON admin_invite_codes;
DROP POLICY IF EXISTS "Allow service role full access" ON admin_invite_codes;

-- 创建新策略：允许服务角色完全访问（用于 API）
CREATE POLICY "Allow service role full access to invite codes"
ON admin_invite_codes
FOR ALL
USING (auth.role() = 'service_role');

-- 创建策略：允许公开读取活跃的邀请码（用于验证）
-- 注意：这允许任何人读取邀请码，但只能读取活跃的
CREATE POLICY "Allow public read access to active invite codes"
ON admin_invite_codes
FOR SELECT
USING (is_active = true);

-- 创建策略：允许服务角色更新邀请码（标记为已使用）
CREATE POLICY "Allow service role to update invite codes"
ON admin_invite_codes
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 验证策略
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'admin_invite_codes'
        AND schemaname = 'public';
    
    RAISE NOTICE '✅ admin_invite_codes 表共有 % 个 RLS 策略', policy_count;
END $$;

