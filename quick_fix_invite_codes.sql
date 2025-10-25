-- 快速修复邀请码RLS策略
-- 这个脚本会临时禁用RLS，让邀请码生成正常工作

-- 临时禁用RLS以允许插入
ALTER TABLE public.admin_invite_codes DISABLE ROW LEVEL SECURITY;

-- 如果表不存在，创建它
CREATE TABLE IF NOT EXISTS public.admin_invite_codes (
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
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_code ON public.admin_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_active ON public.admin_invite_codes(is_active);

-- 重新启用RLS
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- 创建简单的策略，允许服务角色完全访问
DROP POLICY IF EXISTS "Allow service role full access" ON public.admin_invite_codes;
CREATE POLICY "Allow service role full access" ON public.admin_invite_codes
    FOR ALL USING (auth.role() = 'service_role');

-- 允许认证用户读取
DROP POLICY IF EXISTS "Allow authenticated read" ON public.admin_invite_codes;
CREATE POLICY "Allow authenticated read" ON public.admin_invite_codes
    FOR SELECT USING (auth.role() = 'authenticated');

-- 允许认证用户插入
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.admin_invite_codes;
CREATE POLICY "Allow authenticated insert" ON public.admin_invite_codes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 设置权限
GRANT ALL ON public.admin_invite_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invite_codes TO authenticated;

-- 插入一些示例数据
INSERT INTO public.admin_invite_codes (code, max_events, expires_at, is_active, created_by)
VALUES 
    ('INV_DEMO_001', 5, NOW() + INTERVAL '30 days', true, 'admin'),
    ('INV_DEMO_002', 10, NOW() + INTERVAL '60 days', true, 'admin')
ON CONFLICT (code) DO NOTHING;

SELECT 'Invite codes RLS fixed successfully' as status;

