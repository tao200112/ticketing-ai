-- ========================================
-- 数据库重建 - 第四步：创建商家相关表
-- ========================================

BEGIN;

-- 创建商家表
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  max_events INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建商家表索引
CREATE INDEX IF NOT EXISTS idx_merchants_owner_user_id ON public.merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_verified ON public.merchants(verified);

-- 创建商家表更新时间触发器
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
CREATE TRIGGER update_merchants_updated_at 
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建商家成员表
CREATE TABLE IF NOT EXISTS public.merchant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('boss', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, user_id)
);

-- 创建商家成员表索引
CREATE INDEX IF NOT EXISTS idx_merchant_members_merchant_id ON public.merchant_members(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_user_id ON public.merchant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_members_role ON public.merchant_members(role);

-- 创建商家成员表更新时间触发器
DROP TRIGGER IF EXISTS update_merchant_members_updated_at ON public.merchant_members;
CREATE TRIGGER update_merchant_members_updated_at 
    BEFORE UPDATE ON public.merchant_members
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建管理员邀请码表
CREATE TABLE IF NOT EXISTS public.admin_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_events INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin'
);

-- 创建管理员邀请码表索引
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_code ON public.admin_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_active ON public.admin_invite_codes(is_active, expires_at);

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第四步完成：商家相关表已创建';
END $$;

