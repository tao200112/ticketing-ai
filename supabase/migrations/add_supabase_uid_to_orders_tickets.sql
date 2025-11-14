-- 添加 supabase_uid 字段到 orders 和 tickets 表
-- 统一使用 Supabase Auth UID 作为用户标识

-- 为 orders 表添加 supabase_uid 字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supabase_uid UUID;

-- 为 tickets 表添加 supabase_uid 字段
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS supabase_uid UUID;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_orders_supabase_uid ON orders(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_tickets_supabase_uid ON tickets(supabase_uid);

-- 尝试从 auth.users 更新现有记录的 supabase_uid
-- 通过匹配 email 来关联
DO $$
BEGIN
  -- 更新 orders 表的 supabase_uid（通过 customer_email 匹配 auth.users）
  UPDATE orders o
  SET supabase_uid = au.id
  FROM auth.users au
  WHERE o.customer_email = au.email
    AND o.supabase_uid IS NULL
    AND au.id IS NOT NULL;
  
  -- 更新 tickets 表的 supabase_uid（通过 holder_email 匹配 auth.users）
  UPDATE tickets t
  SET supabase_uid = au.id
  FROM auth.users au
  WHERE t.holder_email = au.email
    AND t.supabase_uid IS NULL
    AND au.id IS NOT NULL;
  
  RAISE NOTICE 'Successfully added supabase_uid fields to orders and tickets tables!';
  RAISE NOTICE 'Updated existing records by matching emails with auth.users';
END $$;

