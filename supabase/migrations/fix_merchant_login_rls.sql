-- Fix Merchant Login RLS Issues
-- 修复商家登录相关的RLS策略问题
-- 
-- 问题：如果users表启用了RLS，使用Service Role Key的API调用应该能绕过RLS
-- 但如果使用ANON_KEY，RLS策略可能会阻止查询
-- 
-- 解决方案：确保登录API查询不受RLS影响，或者创建允许的RLS策略

-- ========================================
-- Step 1: 检查users表的RLS状态
-- ========================================

-- 查看当前RLS状态
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- ========================================
-- Step 2: 确保merchants表有正确的RLS策略（如果需要）
-- ========================================

-- 如果merchants表启用了RLS，我们需要允许登录API查询
-- 但Service Role Key应该能绕过RLS，所以主要是为了ANON_KEY的情况

-- 删除可能存在的冲突策略
DROP POLICY IF EXISTS "Merchants: Login API access" ON merchants;

-- 如果有RLS，创建一个允许查询的策略（用于登录验证）
-- 注意：Service Role Key会绕过这个策略，这个策略主要是为ANON_KEY准备的
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'merchants'
    AND rowsecurity = true
  ) THEN
    CREATE POLICY "Merchants: Login API access" ON merchants
    FOR SELECT
    USING (true); -- 允许所有查询，因为登录API使用Service Role Key
  END IF;
END $$;

-- ========================================
-- Step 3: 确保merchant_members表有正确的RLS策略
-- ========================================

-- 删除可能存在的冲突策略
DROP POLICY IF EXISTS "Merchant Members: Login API access" ON merchant_members;

-- 如果有RLS，创建一个允许查询的策略（用于登录验证）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'merchant_members'
    AND rowsecurity = true
  ) THEN
    CREATE POLICY "Merchant Members: Login API access" ON merchant_members
    FOR SELECT
    USING (true); -- 允许所有查询，因为登录API使用Service Role Key
  END IF;
END $$;

-- ========================================
-- Step 4: 确保users表允许商家登录查询
-- ========================================

-- 删除可能存在的冲突策略
DROP POLICY IF EXISTS "Users: Merchant login access" ON users;
DROP POLICY IF EXISTS "Users: Login API access" ON users;

-- 如果有RLS，创建一个允许商家登录查询的策略
-- 允许查询role = 'merchant'的用户
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND rowsecurity = true
  ) THEN
    CREATE POLICY "Users: Login API access" ON users
    FOR SELECT
    USING (
      -- 允许查询商家角色的用户（用于登录验证）
      role = 'merchant'
      -- 或者允许通过auth.uid()查询（如果使用Supabase Auth）
      OR auth.uid() = id
    );
    
    -- 注意：Service Role Key会绕过所有RLS策略
    -- 这个策略主要是为了确保使用ANON_KEY时的兼容性
  END IF;
END $$;

-- ========================================
-- Step 5: 验证配置
-- ========================================

-- 检查users表的RLS策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'merchants', 'merchant_members')
ORDER BY tablename, policyname;

-- ========================================
-- Step 6: 测试查询（应该在Supabase SQL Editor中运行）
-- ========================================

-- 测试查询商家用户（使用Service Role应该能正常工作）
-- SELECT * FROM users WHERE role = 'merchant' LIMIT 1;

-- 测试查询商家信息
-- SELECT * FROM merchants LIMIT 1;

-- 测试查询员工信息
-- SELECT * FROM merchant_members LIMIT 1;

-- ========================================
-- 完成
-- ========================================

SELECT 'Merchant login RLS configuration completed!' as status;

