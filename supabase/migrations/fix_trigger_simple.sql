-- 简化并修复触发器函数
-- 确保触发器不会导致注册失败

-- 1. 删除现有的触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

-- 2. 删除现有的触发器函数
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 3. 创建简化的触发器函数
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
  -- 提取 role（默认为 'user'）
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', ''),
      'user'
    );
    -- 确保 role 是有效值
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
  IF NEW.raw_app_meta_data IS NOT NULL THEN
    v_provider := COALESCE(
      NULLIF(NEW.raw_app_meta_data->>'provider', ''),
      'email'
    );
    -- 确保 provider 是有效值
    IF v_provider NOT IN ('email', 'google', 'github') THEN
      v_provider := 'email';
    END IF;
  END IF;

  -- 尝试插入或更新 users 表
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

  -- 记录成功日志
  RAISE LOG 'handle_new_auth_user_to_users: Successfully processed user email=% role=% id=%', NEW.email, v_role, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 唯一约束冲突，尝试更新现有记录
    RAISE LOG 'handle_new_auth_user_to_users: Unique violation for email=% role=%, attempting update', NEW.email, v_role;
    UPDATE public.users
    SET
      id = NEW.id,
      name = COALESCE(NULLIF(v_name, ''), public.users.name),
      auth_provider = v_provider,
      email_verified_at = COALESCE(NEW.email_confirmed_at, NEW.confirmed_at, public.users.email_verified_at),
      updated_at = NOW()
    WHERE email = NEW.email AND role = v_role;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    -- 外键约束冲突，记录错误但继续
    RAISE LOG 'handle_new_auth_user_to_users: Foreign key violation for email=% id=%, error=%', NEW.email, NEW.id, SQLERRM;
    RETURN NEW;
  WHEN others THEN
    -- 其他错误，记录详细信息但不阻止注册
    RAISE LOG 'handle_new_auth_user_to_users: Error for email=% id=%: SQLSTATE=%, SQLERRM=%', NEW.email, NEW.id, SQLSTATE, SQLERRM;
    -- 不重新抛出异常，允许 Supabase Auth 继续
    RETURN NEW;
END;
$$;

-- 4. 确保函数有正确的权限
ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 5. 创建触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 6. 确保 public.users 表有正确的权限
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 7. 验证设置
DO $$
BEGIN
  RAISE NOTICE 'Trigger function created successfully';
  RAISE NOTICE 'Trigger exists: %', (
    SELECT COUNT(*) > 0 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_to_users'
  );
END $$;

