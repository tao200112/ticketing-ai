-- 修复 admin_invite_codes 表的 RLS 策略
-- 确保管理员可以创建和管理邀请码

-- 首先检查表是否存在
DO $$
BEGIN
    -- 如果表不存在，创建它
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_invite_codes') THEN
        CREATE TABLE public.admin_invite_codes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            max_events INTEGER DEFAULT 10,
            expires_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT true,
            created_by TEXT DEFAULT 'admin',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            used_by TEXT,
            used_at TIMESTAMP WITH TIME ZONE
        );
        
        -- 创建索引
        CREATE INDEX idx_admin_invite_codes_code ON public.admin_invite_codes(code);
        CREATE INDEX idx_admin_invite_codes_active ON public.admin_invite_codes(is_active);
    END IF;
END $$;

-- 启用 RLS
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- 删除现有的策略（如果有）
DROP POLICY IF EXISTS "Allow admin to manage invite codes" ON public.admin_invite_codes;
DROP POLICY IF EXISTS "Allow service role to manage invite codes" ON public.admin_invite_codes;
DROP POLICY IF EXISTS "Allow public read access to active invite codes" ON public.admin_invite_codes;

-- 创建新的策略
-- 1. 允许服务角色完全管理邀请码
CREATE POLICY "Allow service role to manage invite codes" ON public.admin_invite_codes
    FOR ALL USING (auth.role() = 'service_role');

-- 2. 允许管理员用户管理邀请码
CREATE POLICY "Allow admin to manage invite codes" ON public.admin_invite_codes
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role' = 'admin' OR created_by = 'admin')
    );

-- 3. 允许公开读取活跃的邀请码（用于验证）
CREATE POLICY "Allow public read access to active invite codes" ON public.admin_invite_codes
    FOR SELECT USING (is_active = true);

-- 4. 允许认证用户读取所有邀请码（用于管理界面）
CREATE POLICY "Allow authenticated users to read invite codes" ON public.admin_invite_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- 确保表有正确的权限
GRANT ALL ON public.admin_invite_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invite_codes TO authenticated;
GRANT SELECT ON public.admin_invite_codes TO anon;

-- 创建一些示例邀请码
INSERT INTO public.admin_invite_codes (code, max_events, expires_at, is_active, created_by)
VALUES 
    ('INV_DEMO_001', 5, NOW() + INTERVAL '30 days', true, 'admin'),
    ('INV_DEMO_002', 10, NOW() + INTERVAL '60 days', true, 'admin'),
    ('INV_DEMO_003', 20, NOW() + INTERVAL '90 days', true, 'admin')
ON CONFLICT (code) DO NOTHING;

-- 显示结果
SELECT 'admin_invite_codes RLS policies configured successfully' as status;
