-- 更新 RLS policies 以使用 supabase_uid 字段
-- 统一使用 Supabase Auth UID 作为用户标识

-- ========================================
-- 1. 删除旧的 RLS policies
-- ========================================

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;

-- ========================================
-- 2. 创建新的 RLS policies（使用 supabase_uid）
-- ========================================

-- Orders: 用户可以查看自己的订单（优先使用 supabase_uid，回退到 customer_email）
CREATE POLICY "orders_select_own_by_supabase_uid"
  ON orders FOR SELECT
  USING (
    supabase_uid = auth.uid()
    OR (
      -- 回退：如果没有 supabase_uid，使用邮箱匹配
      supabase_uid IS NULL
      AND customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Orders: 用户可以更新自己的订单
CREATE POLICY "orders_update_own_by_supabase_uid"
  ON orders FOR UPDATE
  USING (
    supabase_uid = auth.uid()
    OR (
      supabase_uid IS NULL
      AND customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Tickets: 用户可以查看自己的票据（优先使用 supabase_uid，回退到 holder_email）
CREATE POLICY "tickets_select_own_by_supabase_uid"
  ON tickets FOR SELECT
  USING (
    supabase_uid = auth.uid()
    OR (
      -- 回退：如果没有 supabase_uid，使用邮箱匹配
      supabase_uid IS NULL
      AND holder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ========================================
-- 3. 保持现有的 INSERT 和 UPDATE policies（用于 webhook 和商家操作）
-- ========================================

-- Orders: Service Role 可写入（通过 webhook）
-- 注意：INSERT 允许无检查，依赖应用层验证
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

-- Tickets: 商家或 Service Role 可更新（核销）
-- 保持现有的商家更新 policy（如果存在）
-- 这里不删除，因为商家需要更新他们活动相关的票据

-- ========================================
-- 说明：
-- 1. 新策略优先使用 supabase_uid = auth.uid() 匹配
-- 2. 如果没有 supabase_uid（旧数据），回退到邮箱匹配
-- 3. Service Role 绕过所有 RLS 限制
-- 4. 商家相关的 policies 保持不变
-- ========================================

