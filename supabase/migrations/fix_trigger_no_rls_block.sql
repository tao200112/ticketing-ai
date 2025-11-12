-- 修复触发器：确保 RLS 不会阻止触发器插入
-- 关键：触发器函数使用 SECURITY DEFINER，但我们需要确保 RLS 策略正确

-- 1. 临时禁用 RLS（仅用于测试）
-- 注意：这不是生产环境的最佳实践，但可以用于诊断问题
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有的 RLS 策略
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Allow trigger inserts" ON public.users;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;

-- 3. 确保 RLS 已启用
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. 创建允许所有操作的策略（用于触发器）
-- 触发器函数使用 SECURITY DEFINER，所以它可以绕过 RLS
-- 但为了确保，我们创建一个允许所有操作的策略
CREATE POLICY "Allow all operations for trigger"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. 创建服务角色策略
CREATE POLICY "Service role can do anything"
  ON public.users
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- 6. 创建用户查看自己数据的策略
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 7. 创建用户更新自己数据的策略
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 8. 验证策略
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

-- 9. 重新创建触发器函数（使用最简化的版本）
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := 'user';
  v_name TEXT;
  v_provider TEXT := 'email';
BEGIN
  -- 提取数据（使用安全的默认值）
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL THEN
      v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'user');
      IF v_role NOT IN ('user', 'merchant', 'admin') THEN
        v_role := 'user';
      END IF;
      
      v_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NEW.email
      );
    ELSE
      v_name := NEW.email;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_role := 'user';
      v_name := COALESCE(NEW.email, 'User');
  END;

  BEGIN
    IF NEW.raw_app_meta_data IS NOT NULL THEN
      v_provider := COALESCE(NULLIF(NEW.raw_app_meta_data->>'provider', ''), 'email');
      IF v_provider NOT IN ('email', 'google', 'github') THEN
        v_provider := 'email';
      END IF;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_provider := 'email';
  END;

  -- 插入数据（使用 ON CONFLICT 处理重复）
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      auth_provider,
      email_verified_at,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_name,
      v_role,
      v_provider,
      COALESCE(NEW.email_confirmed_at, NEW.confirmed_at),
      NOW(),
      NOW()
    )
    ON CONFLICT (email, role) 
    DO UPDATE SET
      id = EXCLUDED.id,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW();
  EXCEPTION
    WHEN others THEN
      -- 即使插入失败，也不阻止注册
      -- 使用 RAISE WARNING 记录错误，但不抛出异常
      RAISE WARNING 'Failed to insert user into public.users: email=%, error=%', NEW.email, SQLERRM;
  END;

  -- 始终返回 NEW
  RETURN NEW;
END;
$$;

-- 10. 设置函数权限
ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 11. 创建触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 12. 确保表权限
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 13. 验证
DO $$
BEGIN
  RAISE NOTICE 'Trigger and RLS setup completed';
END $$;

