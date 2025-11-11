-- 快速修复：创建 users 表
-- 在 Supabase SQL Editor 中执行此脚本

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

-- 3. 创建触发器函数
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
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF v_role IS NULL OR v_role NOT IN ('user', 'merchant', 'admin') THEN
    v_role := 'user';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );

  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );

  v_email_verified_at := COALESCE(NEW.email_confirmed_at, NEW.confirmed_at);

  INSERT INTO public.users (
    id, email, name, role, auth_provider, email_verified_at, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_name, v_role, v_provider, v_email_verified_at, NOW(), NOW()
  )
  ON CONFLICT (email, role) DO UPDATE
    SET
      id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name),
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_auth_user_to_users error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 5. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. 设置 RLS 策略
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

CREATE POLICY "Allow service role to manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow public registration" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. 设置权限
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO anon;

-- 8. 回填现有数据
INSERT INTO public.users (
  id, email, name, role, auth_provider, email_verified_at, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    u.email
  ) as name,
  COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'user') as role,
  COALESCE(
    u.raw_app_meta_data->>'provider',
    'email'
  ) as auth_provider,
  COALESCE(u.email_confirmed_at, u.confirmed_at) as email_verified_at,
  COALESCE(u.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users u
ON CONFLICT (email, role) DO UPDATE
  SET
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name),
    auth_provider = EXCLUDED.auth_provider,
    email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
    updated_at = NOW();

-- 9. 验证
SELECT 'Users table created successfully!' as status;

