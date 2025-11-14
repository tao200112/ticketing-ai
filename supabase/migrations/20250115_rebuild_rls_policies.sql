-- ========================================
-- 重建 RLS 策略：修复安全漏洞
-- 迁移日期：2025-01-15
-- 目标：统一使用 supabase_uid 的 RLS 策略
-- ========================================

-- ========================================
-- Step 1: 删除旧的 RLS 策略
-- ========================================

-- Orders 表
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Allow users to view own orders" ON orders;
DROP POLICY IF EXISTS "Allow users to update own orders" ON orders;
DROP POLICY IF EXISTS "orders_select_own_by_supabase_uid" ON orders;
DROP POLICY IF EXISTS "orders_update_own_by_supabase_uid" ON orders;

-- Tickets 表
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Allow users to view own tickets" ON tickets;
DROP POLICY IF EXISTS "tickets_select_own_by_supabase_uid" ON tickets;

-- Ticket Redemptions 表（如果存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    -- 删除所有现有的 ticket_redemptions 策略
    DROP POLICY IF EXISTS "Users can view redemptions of their own tickets" ON ticket_redemptions;
    DROP POLICY IF EXISTS "Merchant staff can insert redemptions" ON ticket_redemptions;
    DROP POLICY IF EXISTS "ticket_redemptions_select_own" ON ticket_redemptions;
    DROP POLICY IF EXISTS "ticket_redemptions_insert_merchant" ON ticket_redemptions;
  END IF;
END $$;

-- ========================================
-- Step 2: 确保 RLS 已启用
-- ========================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    ALTER TABLE ticket_redemptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ========================================
-- Step 3: 创建新的 RLS 策略（使用 supabase_uid）
-- ========================================

-- ========================================
-- Orders 表策略
-- ========================================

-- 用户只能查看自己的订单
CREATE POLICY "orders_select_by_supabase_uid"
  ON orders FOR SELECT
  USING (auth.uid() = supabase_uid);

-- 用户可以更新自己的订单
CREATE POLICY "orders_update_by_supabase_uid"
  ON orders FOR UPDATE
  USING (auth.uid() = supabase_uid);

-- Service Role 可以插入订单（用于 webhook）
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

-- ========================================
-- Tickets 表策略
-- ========================================

-- 用户只能查看自己的票务
CREATE POLICY "tickets_select_by_supabase_uid"
  ON tickets FOR SELECT
  USING (auth.uid() = supabase_uid);

-- Service Role 可以插入票务（用于 webhook）
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

-- 商家员工可以更新他们活动相关的票务（用于核销）
-- 检查用户是否是商家成员
CREATE POLICY "tickets_update_by_merchant_staff"
  ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN merchants m ON m.id = e.merchant_id
      JOIN merchant_members mm ON mm.merchant_id = m.id
      WHERE e.id = tickets.event_id
      AND mm.supabase_uid = auth.uid()
    )
  );

-- ========================================
-- Ticket Redemptions 表策略（关键安全修复）
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    -- 用户只能查看自己票务的核销记录
    CREATE POLICY "ticket_redemptions_select_own"
      ON ticket_redemptions FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM tickets t
          WHERE t.id = ticket_redemptions.ticket_id
          AND t.supabase_uid = auth.uid()
        )
      );
    
    -- 商家员工可以查看他们商家的所有核销记录
    CREATE POLICY "ticket_redemptions_select_merchant"
      ON ticket_redemptions FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM tickets t
          JOIN events e ON e.id = t.event_id
          JOIN merchants m ON m.id = e.merchant_id
          JOIN merchant_members mm ON mm.merchant_id = m.id
          WHERE t.id = ticket_redemptions.ticket_id
          AND mm.supabase_uid = auth.uid()
        )
      );
    
    -- 商家员工可以插入核销记录（操作人必须是当前用户）
    CREATE POLICY "ticket_redemptions_insert_merchant_staff"
      ON ticket_redemptions FOR INSERT
      WITH CHECK (
        -- 操作人必须是当前用户
        (supabase_uid = auth.uid() OR redeemed_by_supabase_uid = auth.uid())
        AND
        -- 用户必须是商家成员
        EXISTS (
          SELECT 1
          FROM tickets t
          JOIN events e ON e.id = t.event_id
          JOIN merchants m ON m.id = e.merchant_id
          JOIN merchant_members mm ON mm.merchant_id = m.id
          WHERE t.id = ticket_redemptions.ticket_id
          AND mm.supabase_uid = auth.uid()
        )
      );
  END IF;
END $$;

-- ========================================
-- Merchants 表策略（如果存在）
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants') THEN
    -- 删除旧策略
    DROP POLICY IF EXISTS "merchants_select_own" ON merchants;
    DROP POLICY IF EXISTS "merchants_update_own" ON merchants;
    
    -- 商家所有者可以查看自己的商家
    CREATE POLICY "merchants_select_owner"
      ON merchants FOR SELECT
      USING (
        owner_supabase_uid = auth.uid()
        OR
        EXISTS (
          SELECT 1
          FROM merchant_members mm
          WHERE mm.merchant_id = merchants.id
          AND mm.supabase_uid = auth.uid()
        )
      );
    
    -- 商家所有者可以更新自己的商家
    CREATE POLICY "merchants_update_owner"
      ON merchants FOR UPDATE
      USING (owner_supabase_uid = auth.uid());
  END IF;
END $$;

-- ========================================
-- Merchant Members 表策略
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_members') THEN
    -- 删除旧策略
    DROP POLICY IF EXISTS "merchant_members_select_own" ON merchant_members;
    
    -- 用户可以查看自己所属的商家成员关系
    CREATE POLICY "merchant_members_select_own"
      ON merchant_members FOR SELECT
      USING (supabase_uid = auth.uid());
    
    -- 商家所有者可以查看自己商家的所有成员
    CREATE POLICY "merchant_members_select_merchant"
      ON merchant_members FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM merchants m
          WHERE m.id = merchant_members.merchant_id
          AND m.owner_supabase_uid = auth.uid()
        )
      );
  END IF;
END $$;

-- ========================================
-- Events 表策略（使用 supabase_uid）
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    -- 删除旧策略
    DROP POLICY IF EXISTS "events_select_public" ON events;
    DROP POLICY IF EXISTS "events_select_merchant" ON events;
    
    -- 所有人可以查看已发布的活动
    CREATE POLICY "events_select_public"
      ON events FOR SELECT
      USING (status = 'published');
    
    -- 商家成员可以查看自己商家的所有活动
    CREATE POLICY "events_select_merchant"
      ON events FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM merchants m
          JOIN merchant_members mm ON mm.merchant_id = m.id
          WHERE m.id = events.merchant_id
          AND mm.supabase_uid = auth.uid()
        )
      );
  END IF;
END $$;

-- ========================================
-- 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Policies Rebuilt Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All policies now use supabase_uid';
  RAISE NOTICE 'Ticket redemptions RLS is now secure';
  RAISE NOTICE 'Next: Run table structure refactoring';
  RAISE NOTICE '========================================';
END $$;

