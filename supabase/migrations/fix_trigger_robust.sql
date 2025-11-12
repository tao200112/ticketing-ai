-- 最健壮的触发器修复方案
-- 确保触发器绝对不会导致注册失败

-- 1. 删除现有触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user_to_users() CASCADE;

-- 2. 创建最简化的触发器函数
-- 关键原则：
-- 1. 使用嵌套的 BEGIN...EXCEPTION...END 块来处理所有可能的错误
-- 2. 使用 RAISE WARNING 而不是 RAISE EXCEPTION
-- 3. 确保在所有情况下都返回 NEW
-- 4. 即使插入失败，也不抛出异常

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
  v_success BOOLEAN := false;
BEGIN
  -- 步骤 1: 安全地提取 role
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL THEN
      v_role := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'role', ''),
        'user'
      );
      IF v_role NOT IN ('user', 'merchant', 'admin') THEN
        v_role := 'user';
      END IF;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_role := 'user';
  END;

  -- 步骤 2: 安全地提取 name
  BEGIN
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
  EXCEPTION
    WHEN others THEN
      v_name := COALESCE(NEW.email, 'unknown');
  END;

  -- 步骤 3: 安全地提取 provider
  BEGIN
    IF NEW.raw_app_meta_data IS NOT NULL THEN
      v_provider := COALESCE(
        NULLIF(NEW.raw_app_meta_data->>'provider', ''),
        'email'
      );
      IF v_provider NOT IN ('email', 'google', 'github') THEN
        v_provider := 'email';
      END IF;
    END IF;
  EXCEPTION
    WHEN others THEN
      v_provider := 'email';
  END;

  -- 步骤 4: 尝试插入数据（使用多重异常处理）
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
      COALESCE(NEW.email, ''),
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
    
    v_success := true;
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
        v_success := true;
      EXCEPTION
        WHEN others THEN
          -- 即使更新失败，也不阻止注册
          v_success := false;
      END;
    WHEN foreign_key_violation THEN
      -- 外键约束冲突，记录但不阻止
      v_success := false;
    WHEN not_null_violation THEN
      -- 非空约束冲突，尝试使用默认值
      BEGIN
        INSERT INTO public.users (
          id,
          email,
          name,
          role,
          auth_provider,
          created_at,
          updated_at
        )
        VALUES (
          NEW.id,
          COALESCE(NEW.email, 'unknown@example.com'),
          COALESCE(v_name, 'User'),
          v_role,
          v_provider,
          NOW(),
          NOW()
        )
        ON CONFLICT (email, role) DO NOTHING;
        v_success := true;
      EXCEPTION
        WHEN others THEN
          v_success := false;
      END;
    WHEN others THEN
      -- 任何其他错误，记录但不阻止注册
      v_success := false;
  END;

  -- 步骤 5: 记录结果（使用 WARNING 而不是 EXCEPTION）
  IF v_success THEN
    -- 成功时记录日志（可选）
    NULL;
  ELSE
    -- 失败时记录警告，但不抛出异常
    RAISE WARNING 'Failed to sync user to public.users: email=%, id=%, role=%', NEW.email, NEW.id, v_role;
  END IF;

  -- 步骤 6: 始终返回 NEW，允许 Supabase Auth 继续
  -- 这是关键：即使同步失败，也允许注册继续
  RETURN NEW;
END;
$$;

-- 3. 设置函数权限和所有者
ALTER FUNCTION public.handle_new_auth_user_to_users() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_to_users() TO postgres, anon, authenticated, service_role;

-- 4. 创建触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 5. 确保表权限
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 6. 验证设置
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO v_function_exists
  FROM pg_proc 
  WHERE proname = 'handle_new_auth_user_to_users';
  
  SELECT COUNT(*) > 0 INTO v_trigger_exists
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created_to_users';
  
  RAISE NOTICE 'Function exists: %', v_function_exists;
  RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
  
  IF v_function_exists AND v_trigger_exists THEN
    RAISE NOTICE 'Trigger setup completed successfully';
  ELSE
    RAISE WARNING 'Trigger setup may have issues';
  END IF;
END $$;

