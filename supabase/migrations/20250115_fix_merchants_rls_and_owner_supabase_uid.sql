-- ============================================================================
-- 修复 Merchants 表 RLS 策略和对齐 owner_supabase_uid
-- ============================================================================
-- 用途：
--   1. 修复 RLS 策略，确保商家本人能看到自己的数据
--   2. 对齐历史数据的 owner_supabase_uid 字段
--   3. 确保 Admin API 使用 service role key 不受 RLS 限制
--
-- 使用方法：
--   在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- ============================================================================

-- 1. 删除旧的 merchants RLS 策略（如果存在）
DROP POLICY IF EXISTS "merchants_select_owner" ON merchants;
DROP POLICY IF EXISTS "merchants_update_owner" ON merchants;
DROP POLICY IF EXISTS "Merchants can view own data" ON merchants;
DROP POLICY IF EXISTS "Merchants: Login API access" ON merchants;
DROP POLICY IF EXISTS "Allow public read access to merchants" ON merchants;
DROP POLICY IF EXISTS "merchants_manage_own" ON merchants;

-- 2. 创建新的 RLS 策略：商家本人可以查看和更新自己的数据
-- 策略基于 owner_supabase_uid = auth.uid()
CREATE POLICY "merchants_select_owner"
  ON merchants
  FOR SELECT
  USING (
    owner_supabase_uid = auth.uid() OR
    -- 向后兼容：如果 owner_supabase_uid 为空，检查 owner_user_id
    (owner_supabase_uid IS NULL AND owner_user_id = auth.uid())
  );

CREATE POLICY "merchants_update_owner"
  ON merchants
  FOR UPDATE
  USING (
    owner_supabase_uid = auth.uid() OR
    -- 向后兼容：如果 owner_supabase_uid 为空，检查 owner_user_id
    (owner_supabase_uid IS NULL AND owner_user_id = auth.uid())
  );

-- 3. 对齐历史数据的 owner_supabase_uid
-- 根据 contact_email 匹配 Supabase auth.users 表中的 email
UPDATE merchants m
SET owner_supabase_uid = au.id
FROM auth.users au
WHERE m.contact_email = au.email
  AND m.owner_supabase_uid IS NULL
  AND au.id IS NOT NULL;

-- 4. 记录无法匹配的商家（用于后续手动处理）
-- 这些商家会在日志中显示，需要手动处理
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM merchants
  WHERE owner_supabase_uid IS NULL
    AND owner_user_id IS NULL
    AND contact_email IS NOT NULL;
  
  IF unmatched_count > 0 THEN
    RAISE NOTICE '⚠️ 发现 % 个商家无法自动匹配 owner_supabase_uid，需要手动处理', unmatched_count;
    RAISE NOTICE '请检查以下商家的 contact_email 是否在 Supabase auth.users 中存在：';
    RAISE NOTICE 'SELECT id, name, contact_email FROM merchants WHERE owner_supabase_uid IS NULL AND owner_user_id IS NULL;';
  END IF;
END $$;

-- 5. 确保 RLS 已启用
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 6. 验证策略
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'merchants';
  
  RAISE NOTICE '✅ Merchants 表 RLS 策略数量: %', policy_count;
END $$;

