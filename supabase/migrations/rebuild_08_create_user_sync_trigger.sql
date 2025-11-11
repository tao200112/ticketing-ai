-- ========================================
-- 数据库重建 - 第八步：创建用户同步触发器
-- ========================================

BEGIN;

-- 创建用户同步触发器函数
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

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

-- 创建用户同步触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 回填现有的 auth.users 数据到 public.users
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
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    u.email
  ) as name,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', ''),
    'user'
  ) as role,
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

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第八步完成：用户同步触发器已创建并回填数据';
END $$;

