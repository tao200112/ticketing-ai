-- 最终的 users 表修复脚本
-- 这个脚本确保所有设置都正确，包括触发器、RLS 和权限

-- 1. 确保 users 表存在
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
  age INTEGER,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_email_role_unique UNIQUE (email, role)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- 3. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. 删除旧的触发器函数（如果存在）
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 6. 创建新的触发器函数（简化版本，确保不会失败）
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
  -- 提取 role
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role NOT IN ('user', 'merchant', 'admin') THEN
      v_role := 'user';
    END IF;
  END IF;

  -- 提取 name
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NEW.email
    );
  ELSE
    v_name := NEW.email;
  END IF;

  -- 提取 provider
  IF NEW.raw_app_meta_data IS NOT NULL AND NEW.raw_app_meta_data->>'provider' IS NOT NULL THEN
    v_provider := NEW.raw_app_meta_data->>'provider';
    IF v_provider NOT IN ('email', 'google', 'github') THEN
      v_provider := 'email';
    END IF;
  END IF;

  -- 插入或更新 users 表
  -- 使用 ON CONFLICT 处理重复
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

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- 记录错误但不阻止注册
    -- 使用 RAISE WARNING 而不是 RAISE EXCEPTION，这样不会阻止事务
    RAISE WARNING 'handle_new_auth_user_to_users error: email=%, role=%, id=%, error=%', NEW.email, v_role, NEW.id, SQLERRM;
    -- 返回 NEW 以允许 Supabase Auth 继续
    RETURN NEW;
END;
$$;

-- 7. 确保函数有正确的权限
ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 8. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 9. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 10. 删除所有旧的 RLS 策略
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Allow trigger inserts" ON public.users;

-- 11. 创建新的 RLS 策略
-- 允许服务角色执行所有操作
CREATE POLICY "Service role can do anything"
  ON public.users
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 允许用户查看自己的数据
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 允许用户更新自己的数据
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 12. 授予必要的权限
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 13. 同步现有的 auth.users 数据
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
SELECT 
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    NULLIF(au.raw_user_meta_data->>'display_name', ''),
    au.email
  ) as name,
  CASE 
    WHEN au.raw_user_meta_data->>'role' IN ('user', 'merchant', 'admin') 
    THEN au.raw_user_meta_data->>'role'
    ELSE 'user'
  END as role,
  COALESCE(
    NULLIF(au.raw_app_meta_data->>'provider', ''),
    'email'
  ) as auth_provider,
  COALESCE(au.email_confirmed_at, au.confirmed_at) as email_verified_at,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (email, role) DO NOTHING;

-- 14. 验证设置
DO $$
BEGIN
  RAISE NOTICE 'Users table setup completed successfully';
  RAISE NOTICE 'Total users in public.users: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'Total users in auth.users: %', (SELECT COUNT(*) FROM auth.users);
END $$;

