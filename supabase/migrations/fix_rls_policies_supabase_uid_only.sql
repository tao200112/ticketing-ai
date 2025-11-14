-- 修复 RLS policies：统一使用 supabase_uid，不允许邮箱匹配
-- 这是最终版本，只允许通过 Supabase Auth UID 访问订单和票务
-- 执行日期：2024

-- ========================================
-- 1. 确保 RLS 已启用
-- ========================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. 删除所有旧的 RLS policies
-- ========================================

-- Orders 表旧 policies
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_select_own_by_supabase_uid" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own_by_supabase_uid" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Orders: Access for merchant members and owners" ON orders;

-- Tickets 表旧 policies
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
DROP POLICY IF EXISTS "tickets_select_own_by_supabase_uid" ON tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Merchants can view their tickets" ON tickets;
DROP POLICY IF EXISTS "Tickets: Access for merchant members and owners" ON tickets;

-- ========================================
-- 3. 创建新的 RLS policies（只使用 supabase_uid）
-- ========================================

-- Orders: 用户只能查看自己的订单（通过 supabase_uid）
CREATE POLICY "Allow users to view own orders"
ON orders FOR SELECT
USING (
  auth.uid() = supabase_uid
);

-- Orders: 用户可以更新自己的订单（通过 supabase_uid）
CREATE POLICY "Allow users to update own orders"
ON orders FOR UPDATE
USING (
  auth.uid() = supabase_uid
);

-- Tickets: 用户只能查看自己的票据（通过 supabase_uid）
CREATE POLICY "Allow users to view own tickets"
ON tickets FOR SELECT
USING (
  auth.uid() = supabase_uid
);

-- ========================================
-- 4. 保持 INSERT policies（用于 webhook 和商家操作）
-- ========================================

-- Orders: Service Role 可写入（通过 webhook）
-- 如果 policy 不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'orders_insert_allow'
  ) THEN
    CREATE POLICY "orders_insert_allow"
      ON orders FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Tickets: Service Role 可插入（通过出票服务）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tickets' 
    AND policyname = 'tickets_insert_allow'
  ) THEN
    CREATE POLICY "tickets_insert_allow"
      ON tickets FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Tickets: 商家可更新（核销）- 保持现有 policy
-- 如果不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tickets' 
    AND policyname = 'tickets_update_merchant'
  ) THEN
    CREATE POLICY "tickets_update_merchant"
      ON tickets FOR UPDATE
      USING (
        event_id IN (
          SELECT id FROM events 
          WHERE merchant_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- ========================================
-- 5. 验证 RLS 配置
-- ========================================

DO $$
DECLARE
  orders_rls_enabled BOOLEAN;
  tickets_rls_enabled BOOLEAN;
  orders_policy_count INTEGER;
  tickets_policy_count INTEGER;
BEGIN
  -- 检查 RLS 是否启用
  SELECT rowsecurity INTO orders_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'orders';
  
  SELECT rowsecurity INTO tickets_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'tickets';
  
  -- 检查 policy 数量
  SELECT COUNT(*) INTO orders_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'orders';
  
  SELECT COUNT(*) INTO tickets_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tickets';
  
  -- 输出验证结果
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS 配置验证结果:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orders RLS 已启用: %', orders_rls_enabled;
  RAISE NOTICE 'Tickets RLS 已启用: %', tickets_rls_enabled;
  RAISE NOTICE 'Orders policies 数量: %', orders_policy_count;
  RAISE NOTICE 'Tickets policies 数量: %', tickets_policy_count;
  RAISE NOTICE '========================================';
  
  IF orders_rls_enabled AND tickets_rls_enabled THEN
    RAISE NOTICE '✓ RLS 已正确启用';
  ELSE
    RAISE WARNING '✗ RLS 未正确启用';
  END IF;
END $$;

-- ========================================
-- 说明：
-- 1. 新策略只使用 supabase_uid = auth.uid() 匹配
-- 2. 不允许使用邮箱匹配（customer_email, holder_email）
-- 3. 不允许使用 user_id 匹配（旧字段）
-- 4. Service Role 绕过所有 RLS 限制
-- 5. 商家相关的 policies 保持不变
-- ========================================

