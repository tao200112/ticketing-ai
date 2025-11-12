-- 修复触发器权限问题的脚本
-- 这个脚本确保触发器函数有正确的权限来插入数据

-- 1. 确保函数有正确的权限
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 2. 确保函数可以访问 public.users 表
GRANT INSERT, UPDATE, SELECT ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 3. 重新创建触发器函数，确保使用 SECURITY DEFINER
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
  -- 使用 ON CONFLICT 处理重复的 email+role 组合
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
  ON CONFLICT (email, role) 
  DO UPDATE SET
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name),
    auth_provider = EXCLUDED.auth_provider,
    email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
    updated_at = NOW()
  RETURNING id INTO v_result_id;

  -- 记录日志
  RAISE LOG 'handle_new_auth_user_to_users: processed email=% role=% id=% provider=%', NEW.email, v_role, v_result_id, v_provider;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- 记录详细错误信息
    RAISE LOG 'handle_new_auth_user_to_users ERROR: email=% role=% id=% SQLSTATE=% SQLERRM=%', NEW.email, v_role, NEW.id, SQLSTATE, SQLERRM;
    -- 重新抛出错误，让 Supabase 知道注册失败
    RAISE EXCEPTION 'Failed to create user record: %', SQLERRM;
END;
$$;

-- 4. 确保触发器正确设置
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 5. 确保 RLS 不会阻止触发器
-- 触发器函数使用 SECURITY DEFINER，所以应该可以绕过 RLS
-- 但我们需要确保表有正确的权限

-- 6. 检查是否有外键约束问题
-- 确保 users.id 可以正确引用 auth.users.id
DO $$
BEGIN
  -- 检查外键约束
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.users'::regclass 
    AND conname = 'users_id_fkey'
  ) THEN
    -- 如果外键不存在，添加它
    ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. 验证设置
DO $$
BEGIN
  RAISE NOTICE 'Trigger function and permissions updated successfully';
  RAISE NOTICE 'Trigger exists: %', (
    SELECT COUNT(*) > 0 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_to_users'
  );
END $$;

