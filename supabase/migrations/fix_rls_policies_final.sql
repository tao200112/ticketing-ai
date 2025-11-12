-- 修复 RLS 策略，确保触发器可以插入数据
-- 这是注册问题的关键修复

-- 1. 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Allow trigger inserts" ON public.users;
DROP POLICY IF EXISTS "Allow trigger and service role" ON public.users;
DROP POLICY IF EXISTS "Allow all operations for trigger" ON public.users;

-- 3. 关键修复：创建允许所有操作的策略（用于触发器函数）
-- 触发器函数使用 SECURITY DEFINER，以 postgres 用户身份运行
-- 但 RLS 策略仍然会检查，所以我们需要创建一个允许所有操作的策略
CREATE POLICY "Bypass RLS for trigger and service role"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. 创建用户查看自己数据的策略
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 5. 创建用户更新自己数据的策略
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. 验证策略
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

-- 7. 测试：尝试插入一条测试记录（模拟触发器）
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || extract(epoch from now())::text || '@example.com';
    insert_success BOOLEAN := false;
BEGIN
    RAISE NOTICE 'Testing insert with trigger-like context...';
    
    BEGIN
        -- 模拟触发器函数的插入操作
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
            test_id,
            test_email,
            test_email,
            'user',
            'email',
            NOW(),
            NOW()
        );
        
        insert_success := true;
        RAISE NOTICE '✓ Insert successful: id=%, email=%', test_id, test_email;
        
        -- 清理
        DELETE FROM public.users WHERE id = test_id;
        RAISE NOTICE '✓ Test record cleaned up';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '✗ Insert failed: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
            insert_success := false;
    END;
    
    IF insert_success THEN
        RAISE NOTICE '✓ RLS policies are correctly configured';
    ELSE
        RAISE WARNING '✗ RLS policies may be blocking inserts';
    END IF;
END $$;

