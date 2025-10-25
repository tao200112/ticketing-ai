-- 修复 users 表的 RLS 策略
-- 解决无限递归问题

-- 首先检查表是否存在
DO $$
BEGIN
    -- 如果表不存在，创建它
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- 创建索引
        CREATE INDEX idx_users_email ON public.users(email);
    END IF;
END $$;

-- 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 删除所有现有的策略（避免冲突）
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

-- 创建新的策略
-- 1. 允许服务角色完全管理用户
CREATE POLICY "Allow service role to manage users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- 2. 允许用户查看自己的资料
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

-- 3. 允许用户更新自己的资料
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 4. 允许公开注册（插入新用户）
CREATE POLICY "Allow public registration" ON public.users
    FOR INSERT WITH CHECK (true);

-- 5. 允许认证用户读取所有用户（用于管理）
CREATE POLICY "Allow authenticated users to read users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

-- 确保表有正确的权限
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO anon;

-- 显示结果
SELECT 'users RLS policies configured successfully' as status;
