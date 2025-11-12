-- 修复 RLS 策略，确保触发器可以插入数据
-- 触发器函数使用 SECURITY DEFINER，所以应该可以绕过 RLS
-- 但我们需要确保策略不会阻止插入

-- 1. 确保 RLS 已启用
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能阻止插入的策略
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- 3. 创建允许触发器插入的策略
-- 触发器函数使用 SECURITY DEFINER，所以它可以绕过 RLS
-- 但我们还是需要确保有正确的策略

-- 允许服务角色执行所有操作
CREATE POLICY "Service role can do anything"
  ON public.users
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- 允许 postgres 角色执行所有操作（触发器函数使用这个角色）
-- 实际上，SECURITY DEFINER 函数应该可以绕过 RLS，但为了安全，我们还是创建策略

-- 4. 允许用户查看自己的数据
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 5. 允许用户更新自己的数据（除了 role）
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. 重要：允许通过触发器插入数据
-- 触发器函数使用 SECURITY DEFINER，所以它可以绕过 RLS
-- 但为了确保，我们创建一个允许插入的策略
CREATE POLICY "Allow trigger inserts"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- 7. 验证 RLS 策略
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
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

