-- 修复函数搜索路径可变性警告
-- 这些警告与 Supabase 自动生成的函数相关

-- ========================================
-- 1. 检查当前有问题的函数
-- ========================================

-- 查看有搜索路径问题的函数
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as function_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('handle_new_auth_user_', 'handle_new_user')
ORDER BY p.proname;

-- ========================================
-- 2. 修复 handle_new_auth_user_ 函数
-- ========================================

-- 检查函数是否存在并修复
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_auth_user_'
    ) THEN
        -- 重新创建函数，设置安全的搜索路径
        DROP FUNCTION IF EXISTS public.handle_new_auth_user_ CASCADE;
        
        -- 创建安全的函数版本
        CREATE OR REPLACE FUNCTION public.handle_new_auth_user_()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
            INSERT INTO public.users (id, email, name, age, role)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
                COALESCE((NEW.raw_user_meta_data->>'age')::integer, 18),
                'user'
            );
            RETURN NEW;
        END;
        $$;
        
        -- 重新创建触发器
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_();
        
        RAISE NOTICE '已修复 handle_new_auth_user_ 函数';
    ELSE
        RAISE NOTICE 'handle_new_auth_user_ 函数不存在，跳过';
    END IF;
END $$;

-- ========================================
-- 3. 修复 handle_new_user 函数
-- ========================================

-- 检查函数是否存在并修复
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN
        -- 重新创建函数，设置安全的搜索路径
        DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
        
        -- 创建安全的函数版本
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
            INSERT INTO public.users (id, email, name, age, role)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
                COALESCE((NEW.raw_user_meta_data->>'age')::integer, 18),
                'user'
            );
            RETURN NEW;
        END;
        $$;
        
        -- 重新创建触发器
        DROP TRIGGER IF EXISTS on_auth_user_created_alt ON auth.users;
        CREATE TRIGGER on_auth_user_created_alt
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        
        RAISE NOTICE '已修复 handle_new_user 函数';
    ELSE
        RAISE NOTICE 'handle_new_user 函数不存在，跳过';
    END IF;
END $$;

-- ========================================
-- 4. 设置全局搜索路径安全
-- ========================================

-- 设置数据库级别的搜索路径
ALTER DATABASE postgres SET search_path = public;

-- 设置用户级别的搜索路径（如果可能）
-- 注意：这可能需要超级用户权限
DO $$
BEGIN
    -- 尝试设置当前用户的搜索路径
    PERFORM set_config('search_path', 'public', false);
    RAISE NOTICE '已设置搜索路径为 public';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '无法设置搜索路径: %', SQLERRM;
END $$;

-- ========================================
-- 5. 验证修复结果
-- ========================================

-- 检查修复后的函数
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as function_config,
    CASE 
        WHEN p.proconfig IS NULL OR 'search_path=public' = ANY(p.proconfig) THEN '✅ 安全'
        ELSE '⚠️ 需要检查'
    END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('handle_new_auth_user_', 'handle_new_user')
ORDER BY p.proname;

-- ========================================
-- 6. 输出修复结果
-- ========================================

DO $$
DECLARE
    function_count INTEGER;
    secure_count INTEGER;
BEGIN
    -- 统计相关函数数量
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND p.proname IN ('handle_new_auth_user_', 'handle_new_user');
    
    -- 统计安全配置的函数数量
    SELECT COUNT(*) INTO secure_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND p.proname IN ('handle_new_auth_user_', 'handle_new_user')
        AND (p.proconfig IS NULL OR 'search_path=public' = ANY(p.proconfig));
    
    RAISE NOTICE '🔧 函数搜索路径修复完成！';
    RAISE NOTICE '相关函数数量: %', function_count;
    RAISE NOTICE '安全配置的函数数量: %', secure_count;
    
    IF secure_count = function_count THEN
        RAISE NOTICE '✅ 所有函数已安全配置';
    ELSE
        RAISE NOTICE '⚠️ 部分函数可能需要进一步检查';
    END IF;
    
    RAISE NOTICE '请重新运行 Security Advisor 检查警告是否已解决';
END $$;
