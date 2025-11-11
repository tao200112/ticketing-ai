-- 完整的 users 表修复脚本
-- 这个脚本会创建 users 表、触发器、索引和 RLS 策略

-- 1. 创建 users 表（如果不存在）
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

-- 5. 创建从 auth.users 同步到 public.users 的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_provider TEXT;
  v_email_verified_at TIMESTAMPTZ;
  v_result_id UUID;
BEGIN
  -- 从 metadata 中提取 role，默认为 'user'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF v_role IS NULL OR v_role NOT IN ('user', 'merchant', 'admin') THEN
    v_role := 'user';
  END IF;

  -- 从 metadata 中提取 name
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );

  -- 从 metadata 中提取 provider
  -- 注意：Supabase 使用 raw_app_meta_data 而不是 app_metadata
  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );
  
  IF v_provider IS NULL OR v_provider NOT IN ('email', 'google', 'github') THEN
    v_provider := 'email';
  END IF;

  -- 获取邮箱验证时间
  v_email_verified_at := COALESCE(NEW.email_confirmed_at, NEW.confirmed_at);

  -- 插入或更新 users 表
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
    v_email_verified_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (email, role) DO UPDATE
    SET
      id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW()
  RETURNING id INTO v_result_id;

  -- 记录日志
  IF v_result_id = NEW.id THEN
    RAISE LOG 'handle_new_auth_user_to_users: inserted email=% role=% id=% provider=%', NEW.email, v_role, v_result_id, v_provider;
  ELSE
    RAISE LOG 'handle_new_auth_user_to_users: updated existing record for email=% role=% existing_id=% auth_id=% provider=%', NEW.email, v_role, v_result_id, NEW.id, v_provider;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_auth_user_to_users error email=% role=% id=% state=% message=%', NEW.email, v_role, NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 7. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. 删除旧的 RLS 策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- 9. 创建 RLS 策略
-- 用户可以查看自己的数据
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 用户可以更新自己的数据
-- 注意：role 字段的更新应该通过其他方式控制（如应用层逻辑或管理员权限）
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 服务角色可以执行所有操作
CREATE POLICY "Service role can do anything"
  ON public.users
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 10. 为现有的 auth.users 同步数据（如果还没有同步）
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
    au.raw_app_meta_data->>'provider',
    'email'
  ) as auth_provider,
  COALESCE(au.email_confirmed_at, au.confirmed_at) as email_verified_at,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (email, role) DO NOTHING;

-- 11. 验证设置
DO $$
BEGIN
  RAISE NOTICE 'Users table setup completed successfully';
  RAISE NOTICE 'Total users in public.users: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'Total users in auth.users: %', (SELECT COUNT(*) FROM auth.users);
END $$;

