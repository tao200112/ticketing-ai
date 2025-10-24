-- 用户同步触发器 - 确保 auth.users 同步到 public.users
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 创建业务用户表（如果不存在）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','merchant','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建同步函数
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''), 
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email, 
    name = EXCLUDED.name, 
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

-- 4. 创建新触发器
CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

-- 5. 回填历史数据（只需执行一次）
INSERT INTO public.users (id, email, name, role)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'name', ''), 
  'user'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 6. 添加商家唯一约束（如果不存在）
ALTER TABLE public.merchants 
  ADD CONSTRAINT IF NOT EXISTS merchants_owner_unique UNIQUE (owner_user_id);

-- 7. 验证数据同步
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name, 
  COUNT(*) as count 
FROM public.users;

-- 8. 检查邀请码表
SELECT 
  'admin_invite_codes' as table_name, 
  COUNT(*) as count 
FROM public.admin_invite_codes;
