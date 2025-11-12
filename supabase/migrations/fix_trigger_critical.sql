-- 关键修复：确保触发器不会导致注册失败
-- 这个脚本修复触发器函数，确保它不会抛出异常

-- 1. 删除现有触发器
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

-- 2. 删除现有函数
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 3. 创建最简化的触发器函数
-- 关键：使用 RAISE WARNING 而不是 RAISE EXCEPTION，并且始终返回 NEW
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
BEGIN
  -- 设置默认值
  v_role := 'user';
  v_name := NEW.email;
  v_provider := 'email';

  -- 安全地提取 role
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      v_role := NEW.raw_user_meta_data->>'role';
      IF v_role NOT IN ('user', 'merchant', 'admin') THEN
        v_role := 'user';
      END IF;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_role := 'user';
  END;

  -- 安全地提取 name
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL THEN
      v_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NEW.email
      );
    END IF;
  EXCEPTION
    WHEN others THEN
      v_name := NEW.email;
  END;

  -- 安全地提取 provider
  BEGIN
    IF NEW.raw_app_meta_data IS NOT NULL AND NEW.raw_app_meta_data->>'provider' IS NOT NULL THEN
      v_provider := NEW.raw_app_meta_data->>'provider';
      IF v_provider NOT IN ('email', 'google', 'github') THEN
        v_provider := 'email';
      END IF;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_provider := 'email';
  END;

  -- 尝试插入或更新，使用嵌套的异常处理
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
    WHEN unique_violation THEN
      -- 唯一约束冲突，尝试更新
      BEGIN
        UPDATE public.users
        SET
          id = NEW.id,
          name = COALESCE(NULLIF(v_name, ''), public.users.name),
          auth_provider = v_provider,
          email_verified_at = COALESCE(NEW.email_confirmed_at, NEW.confirmed_at, public.users.email_verified_at),
          updated_at = NOW()
        WHERE email = NEW.email AND role = v_role;
      EXCEPTION
        WHEN others THEN
          -- 即使更新失败，也不阻止注册
          NULL;
      END;
    WHEN others THEN
      -- 任何其他错误，记录但不阻止注册
      -- 使用 RAISE WARNING 而不是 RAISE EXCEPTION
      RAISE WARNING 'Failed to sync user to public.users: email=%, error=%', NEW.email, SQLERRM;
  END;

  -- 始终返回 NEW，允许 Supabase Auth 继续
  RETURN NEW;
END;
$$;

-- 4. 设置函数权限
ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 5. 创建触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 6. 确保表权限正确
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 7. 验证
DO $$
BEGIN
  RAISE NOTICE 'Trigger function created successfully';
  RAISE NOTICE 'Function exists: %', (
    SELECT COUNT(*) > 0 
    FROM pg_proc 
    WHERE proname = 'handle_new_auth_user_to_users'
  );
  RAISE NOTICE 'Trigger exists: %', (
    SELECT COUNT(*) > 0 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_to_users'
  );
END $$;

