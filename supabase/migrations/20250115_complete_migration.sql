-- ========================================
-- PartyTix 数据库全面修复 - 完整迁移脚本
-- 执行日期：2025-01-15
-- 
-- 说明：此文件包含所有迁移步骤，按顺序执行
-- 在 Supabase SQL Editor 中直接运行此文件即可
-- ========================================

-- ========================================
-- 迁移 1/5: 统一用户体系
-- ========================================

-- ========================================
-- 全面修复 PartyTix 数据库：统一用户体系
-- 迁移日期：2025-01-15
-- 目标：将所有 user_id 字段迁移到 supabase_uid
-- ========================================

-- ========================================
-- Step 1: 创建 ENUM 类型（先创建，后续使用）
-- ========================================

-- Orders status ENUM
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status') THEN
    CREATE TYPE orders_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

-- Ticket status ENUM
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('unused', 'used', 'revoked');
  END IF;
END $$;

-- ========================================
-- Step 2: 为所有表添加 supabase_uid 字段（如果不存在）
-- ========================================

-- Orders 表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN orders.supabase_uid IS 'Supabase Auth UID - Primary user identifier (replaces user_id)';

-- Tickets 表（应该已存在，但确保存在）
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN tickets.supabase_uid IS 'Supabase Auth UID - Primary user identifier (replaces user_id)';

-- Merchant Members 表
ALTER TABLE merchant_members ADD COLUMN IF NOT EXISTS supabase_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE;
COMMENT ON COLUMN merchant_members.supabase_uid IS 'Supabase Auth UID - Primary user identifier (replaces user_id)';

-- Merchants 表
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN merchants.owner_supabase_uid IS 'Supabase Auth UID of merchant owner (replaces owner_user_id)';

-- Ticket Redemptions 表（如果存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    ALTER TABLE ticket_redemptions ADD COLUMN IF NOT EXISTS supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN ticket_redemptions.supabase_uid IS 'Supabase Auth UID of user who performed redemption (replaces user_id)';
    
    -- 如果存在 redeemed_by 字段，也添加 supabase_uid 版本
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_redemptions' AND column_name = 'redeemed_by') THEN
      ALTER TABLE ticket_redemptions ADD COLUMN IF NOT EXISTS redeemed_by_supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
      COMMENT ON COLUMN ticket_redemptions.redeemed_by_supabase_uid IS 'Supabase Auth UID of staff who redeemed (replaces redeemed_by)';
    END IF;
  END IF;
END $$;

-- ========================================
-- Step 3: 迁移现有数据：从 user_id 填充 supabase_uid
-- ========================================

-- Orders: 通过 users 表匹配（如果 users 表有 supabase_uid 字段）
DO $$
BEGIN
  -- 如果 users 表有 supabase_uid 字段，使用它
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'supabase_uid'
  ) THEN
    UPDATE orders o
    SET supabase_uid = u.supabase_uid
    FROM users u
    WHERE o.user_id = u.id
      AND o.supabase_uid IS NULL
      AND u.supabase_uid IS NOT NULL;
  ELSE
    -- 否则通过 email 匹配 auth.users
    UPDATE orders o
    SET supabase_uid = au.id
    FROM auth.users au
    WHERE o.customer_email = au.email
      AND o.supabase_uid IS NULL
      AND au.id IS NOT NULL;
  END IF;
  
  RAISE NOTICE 'Migrated orders.supabase_uid from user_id/email';
END $$;

-- Tickets: 通过 users 表或 email 匹配
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'supabase_uid'
  ) THEN
    UPDATE tickets t
    SET supabase_uid = u.supabase_uid
    FROM users u
    WHERE t.user_id = u.id
      AND t.supabase_uid IS NULL
      AND u.supabase_uid IS NOT NULL;
  END IF;
  
  -- 回退：通过 email 匹配
  UPDATE tickets t
  SET supabase_uid = au.id
  FROM auth.users au
  WHERE t.holder_email = au.email
    AND t.supabase_uid IS NULL
    AND au.id IS NOT NULL;
  
  RAISE NOTICE 'Migrated tickets.supabase_uid from user_id/email';
END $$;

-- Merchant Members: 通过 users 表匹配
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'supabase_uid'
  ) THEN
    UPDATE merchant_members mm
    SET supabase_uid = u.supabase_uid
    FROM users u
    WHERE mm.user_id = u.id
      AND mm.supabase_uid IS NULL
      AND u.supabase_uid IS NOT NULL;
  ELSE
    -- 如果没有 users.supabase_uid，尝试通过 email 匹配
    -- 注意：merchant_members 可能没有直接的 email，需要从 users 表获取
    UPDATE merchant_members mm
    SET supabase_uid = au.id
    FROM users u
    JOIN auth.users au ON au.email = u.email
    WHERE mm.user_id = u.id
      AND mm.supabase_uid IS NULL
      AND au.id IS NOT NULL;
  END IF;
  
  RAISE NOTICE 'Migrated merchant_members.supabase_uid from user_id';
END $$;

-- Merchants: 通过 users 表匹配 owner_user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'supabase_uid'
  ) THEN
    UPDATE merchants m
    SET owner_supabase_uid = u.supabase_uid
    FROM users u
    WHERE m.owner_user_id = u.id
      AND m.owner_supabase_uid IS NULL
      AND u.supabase_uid IS NOT NULL;
  ELSE
    UPDATE merchants m
    SET owner_supabase_uid = au.id
    FROM users u
    JOIN auth.users au ON au.email = u.email
    WHERE m.owner_user_id = u.id
      AND m.owner_supabase_uid IS NULL
      AND au.id IS NOT NULL;
  END IF;
  
  RAISE NOTICE 'Migrated merchants.owner_supabase_uid from owner_user_id';
END $$;

-- Ticket Redemptions: 迁移 user_id 和 redeemed_by
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    -- 迁移 user_id -> supabase_uid
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'supabase_uid'
    ) THEN
      UPDATE ticket_redemptions tr
      SET supabase_uid = u.supabase_uid
      FROM users u
      WHERE tr.user_id = u.id
        AND tr.supabase_uid IS NULL
        AND u.supabase_uid IS NOT NULL;
    END IF;
    
    -- 迁移 redeemed_by -> redeemed_by_supabase_uid
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ticket_redemptions' AND column_name = 'redeemed_by'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'supabase_uid'
      ) THEN
        UPDATE ticket_redemptions tr
        SET redeemed_by_supabase_uid = u.supabase_uid
        FROM users u
        WHERE tr.redeemed_by = u.id
          AND tr.redeemed_by_supabase_uid IS NULL
          AND u.supabase_uid IS NOT NULL;
      END IF;
    END IF;
    
    RAISE NOTICE 'Migrated ticket_redemptions supabase_uid fields';
  END IF;
END $$;

-- ========================================
-- Step 4: 创建索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_supabase_uid ON orders(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_tickets_supabase_uid ON tickets(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_merchant_members_supabase_uid ON merchant_members(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_supabase_uid ON merchants(owner_supabase_uid);

-- Ticket Redemptions 索引
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_supabase_uid ON ticket_redemptions(supabase_uid);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_redemptions' AND column_name = 'redeemed_by_supabase_uid') THEN
      CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_redeemed_by_supabase_uid ON ticket_redemptions(redeemed_by_supabase_uid);
    END IF;
  END IF;
END $$;

-- ========================================
-- Step 5: 标记废弃字段（添加注释）
-- ========================================

COMMENT ON COLUMN orders.user_id IS 'DEPRECATED: Use supabase_uid instead. This field is kept for backward compatibility only.';
COMMENT ON COLUMN tickets.user_id IS 'DEPRECATED: Use supabase_uid instead. This field is kept for backward compatibility only.';
COMMENT ON COLUMN merchant_members.user_id IS 'DEPRECATED: Use supabase_uid instead. This field is kept for backward compatibility only.';
COMMENT ON COLUMN merchants.owner_user_id IS 'DEPRECATED: Use owner_supabase_uid instead. This field is kept for backward compatibility only.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_redemptions' AND column_name = 'user_id') THEN
      COMMENT ON COLUMN ticket_redemptions.user_id IS 'DEPRECATED: Use supabase_uid instead. This field is kept for backward compatibility only.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_redemptions' AND column_name = 'redeemed_by') THEN
      COMMENT ON COLUMN ticket_redemptions.redeemed_by IS 'DEPRECATED: Use redeemed_by_supabase_uid instead. This field is kept for backward compatibility only.';
    END IF;
  END IF;
END $$;

-- ========================================
-- 迁移 1 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 1/5: User System Unification Complete!';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 迁移 2/5: 重建 RLS 策略
-- ========================================

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
-- 迁移 2 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 2/5: RLS Policies Rebuilt Successfully!';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 迁移 3/5: 重构票务表结构
-- ========================================

-- ========================================
-- 重构 Tickets 表结构：合并 snapshot 字段为 JSONB
-- 迁移日期：2025-01-15
-- 目标：简化表结构，提高可维护性
-- ========================================

-- ========================================
-- Step 1: 添加新的 JSONB 字段
-- ========================================

-- Event snapshot JSONB
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_snapshot JSONB;
COMMENT ON COLUMN tickets.event_snapshot IS 'Event data snapshot at ticket creation time (replaces event_*_snapshot fields)';

-- Price snapshot JSONB
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price_snapshot JSONB;
COMMENT ON COLUMN tickets.price_snapshot IS 'Price data snapshot at ticket creation time (replaces price_*_snapshot fields)';

-- ========================================
-- Step 2: 迁移现有数据到 JSONB 字段
-- ========================================

-- 迁移 event snapshot 数据
UPDATE tickets
SET event_snapshot = jsonb_build_object(
  'title', event_title_snapshot,
  'description', event_description_snapshot,
  'venue', event_venue_snapshot,
  'address', event_address_snapshot,
  'poster_url', event_poster_url_snapshot,
  'start_at', event_start_at_snapshot,
  'end_at', event_end_at_snapshot
)
WHERE event_snapshot IS NULL
  AND (
    event_title_snapshot IS NOT NULL
    OR event_description_snapshot IS NOT NULL
    OR event_venue_snapshot IS NOT NULL
    OR event_address_snapshot IS NOT NULL
    OR event_poster_url_snapshot IS NOT NULL
    OR event_start_at_snapshot IS NOT NULL
    OR event_end_at_snapshot IS NOT NULL
  );

-- 迁移 price snapshot 数据
UPDATE tickets
SET price_snapshot = jsonb_build_object(
  'name', price_name_snapshot,
  'amount_cents', price_amount_cents_snapshot,
  'currency', price_currency_snapshot
)
WHERE price_snapshot IS NULL
  AND (
    price_name_snapshot IS NOT NULL
    OR price_amount_cents_snapshot IS NOT NULL
    OR price_currency_snapshot IS NOT NULL
  );

-- ========================================
-- Step 3: 标记旧字段为废弃（添加注释）
-- ========================================

COMMENT ON COLUMN tickets.event_title_snapshot IS 'DEPRECATED: Use event_snapshot->>title instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_description_snapshot IS 'DEPRECATED: Use event_snapshot->>description instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_venue_snapshot IS 'DEPRECATED: Use event_snapshot->>venue instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_address_snapshot IS 'DEPRECATED: Use event_snapshot->>address instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_poster_url_snapshot IS 'DEPRECATED: Use event_snapshot->>poster_url instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_start_at_snapshot IS 'DEPRECATED: Use event_snapshot->>start_at instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.event_end_at_snapshot IS 'DEPRECATED: Use event_snapshot->>end_at instead. Kept for backward compatibility.';

COMMENT ON COLUMN tickets.price_name_snapshot IS 'DEPRECATED: Use price_snapshot->>name instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.price_amount_cents_snapshot IS 'DEPRECATED: Use price_snapshot->>amount_cents instead. Kept for backward compatibility.';
COMMENT ON COLUMN tickets.price_currency_snapshot IS 'DEPRECATED: Use price_snapshot->>currency instead. Kept for backward compatibility.';

-- ========================================
-- Step 4: 标记 status 字段为废弃（如果与 used 重复）
-- ========================================

-- 检查 status 和 used 字段的一致性
DO $$
BEGIN
  -- 如果 status = 'used' 但 used = false，修复数据
  UPDATE tickets
  SET used = true, used_at = COALESCE(used_at, NOW())
  WHERE status = 'used' AND used = false;
  
  -- 如果 used = true 但 status != 'used'，修复数据
  UPDATE tickets
  SET status = 'used'
  WHERE used = true AND status != 'used';
  
  RAISE NOTICE 'Synchronized status and used fields';
END $$;

COMMENT ON COLUMN tickets.status IS 'DEPRECATED: Use used field instead. Kept for backward compatibility. Status: unused=used=false, used=used=true, revoked=used=true with special flag.';

-- ========================================
-- Step 5: 创建 JSONB 索引（如果需要）
-- ========================================

-- 为 event_snapshot 创建 GIN 索引（支持 JSONB 查询）
CREATE INDEX IF NOT EXISTS idx_tickets_event_snapshot ON tickets USING GIN (event_snapshot);

-- 为 price_snapshot 创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_tickets_price_snapshot ON tickets USING GIN (price_snapshot);

-- ========================================
-- 迁移 3 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 3/5: Tickets Table Refactoring Complete!';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 迁移 4/5: ENUM 化 status 字段
-- ========================================

-- ========================================
-- ENUM 化 status 字段：避免脏数据
-- 迁移日期：2025-01-15
-- 目标：将 TEXT status 字段迁移到 ENUM 类型
-- ========================================

-- ========================================
-- Step 1: 清理现有数据（统一格式）
-- ========================================

-- Orders status 清理
UPDATE orders
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

-- 修复常见拼写错误
UPDATE orders
SET status = 'paid'
WHERE status IN ('payed', 'Payed', 'Paid', 'PAID');

UPDATE orders
SET status = 'pending'
WHERE status IN ('Pending', 'PENDING', 'pending');

UPDATE orders
SET status = 'failed'
WHERE status IN ('Failed', 'FAILED', 'fail');

UPDATE orders
SET status = 'refunded'
WHERE status IN ('Refunded', 'REFUNDED', 'refund');

-- Tickets status 清理
UPDATE tickets
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

UPDATE tickets
SET status = 'unused'
WHERE status IN ('Unused', 'UNUSED', 'available', 'Available');

UPDATE tickets
SET status = 'used'
WHERE status IN ('Used', 'USED', 'redeemed', 'Redeemed');

UPDATE tickets
SET status = 'revoked'
WHERE status IN ('Revoked', 'REVOKED', 'cancelled', 'Cancelled', 'refunded', 'Refunded');

-- ========================================
-- Step 2: 添加新的 ENUM 列（临时）
-- ========================================

-- Orders: 添加新列
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_enum orders_status;

-- Tickets: 添加新列
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status_enum ticket_status;

-- ========================================
-- Step 3: 迁移数据到新列
-- ========================================

-- Orders: 迁移数据
UPDATE orders
SET status_enum = CASE
  WHEN status = 'pending' THEN 'pending'::orders_status
  WHEN status = 'paid' THEN 'paid'::orders_status
  WHEN status = 'failed' THEN 'failed'::orders_status
  WHEN status = 'refunded' THEN 'refunded'::orders_status
  ELSE 'pending'::orders_status  -- 默认值
END
WHERE status_enum IS NULL;

-- Tickets: 迁移数据
UPDATE tickets
SET status_enum = CASE
  WHEN status = 'unused' THEN 'unused'::ticket_status
  WHEN status = 'used' THEN 'used'::ticket_status
  WHEN status = 'revoked' THEN 'revoked'::ticket_status
  ELSE 'unused'::ticket_status  -- 默认值
END
WHERE status_enum IS NULL;

-- ========================================
-- Step 4: 删除旧列约束，重命名新列
-- ========================================

-- Orders: 删除旧约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 删除旧列，重命名新列
ALTER TABLE orders DROP COLUMN IF EXISTS status;
ALTER TABLE orders RENAME COLUMN status_enum TO status;

-- 添加 NOT NULL 约束
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::orders_status;

-- Tickets: 删除旧约束
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- 删除旧列，重命名新列
ALTER TABLE tickets DROP COLUMN IF EXISTS status;
ALTER TABLE tickets RENAME COLUMN status_enum TO status;

-- 添加 NOT NULL 约束
ALTER TABLE tickets ALTER COLUMN status SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'unused'::ticket_status;

-- ========================================
-- Step 5: 添加注释
-- ========================================

COMMENT ON COLUMN orders.status IS 'Order status using ENUM type (pending, paid, failed, refunded)';
COMMENT ON COLUMN tickets.status IS 'Ticket status using ENUM type (unused, used, revoked). DEPRECATED: Prefer using used field.';

-- ========================================
-- 迁移 4 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 4/5: Status Fields ENUM Migration Complete!';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 迁移 5/5: 重构 short_id
-- ========================================

-- ========================================
-- 重构 short_id：使用 nanoid 并添加重试机制
-- 迁移日期：2025-01-15
-- 目标：使用 nanoid(10) 替代当前 short_id 生成逻辑
-- ========================================

-- ========================================
-- Step 1: 验证现有 short_id 格式
-- ========================================

-- 检查是否有冲突的 short_id
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT short_id, COUNT(*) as cnt
    FROM tickets
    GROUP BY short_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate short_id values. These need to be fixed before migration.', duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicate short_id values found. Safe to proceed.';
  END IF;
END $$;

-- ========================================
-- Step 2: 确保 short_id 约束正确
-- ========================================

-- 确保 UNIQUE 约束存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_short_id_key'
  ) THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_short_id_key UNIQUE (short_id);
    RAISE NOTICE 'Added UNIQUE constraint on tickets.short_id';
  END IF;
END $$;

-- ========================================
-- Step 3: 创建生成 nanoid 的函数（应用层使用）
-- ========================================

CREATE OR REPLACE FUNCTION generate_nanoid_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INTEGER;
  random_val INTEGER;
BEGIN
  -- 生成 10 字符的 nanoid
  FOR i IN 1..10 LOOP
    random_val := floor(random() * length(chars))::INTEGER + 1;
    result := result || substr(chars, random_val, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_nanoid_short_id() IS 'Generates a 10-character nanoid for ticket short_id. Use with retry logic in application code.';

-- ========================================
-- Step 4: 创建带重试的插入函数（示例）
-- ========================================

CREATE OR REPLACE FUNCTION insert_ticket_with_retry(
  p_order_id UUID,
  p_event_id UUID,
  p_tier TEXT,
  p_holder_email TEXT,
  p_supabase_uid UUID,
  p_max_retries INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
  v_short_id TEXT;
  v_ticket_id UUID;
  v_attempt INTEGER := 0;
  v_success BOOLEAN := false;
BEGIN
  WHILE v_attempt < p_max_retries AND NOT v_success LOOP
    v_attempt := v_attempt + 1;
    
    -- 生成新的 short_id
    v_short_id := generate_nanoid_short_id();
    
    BEGIN
      -- 尝试插入
      INSERT INTO tickets (
        order_id, event_id, tier, holder_email, supabase_uid, short_id, status
      ) VALUES (
        p_order_id, p_event_id, p_tier, p_holder_email, p_supabase_uid, v_short_id, 'unused'::ticket_status
      ) RETURNING id INTO v_ticket_id;
      
      v_success := true;
      RAISE NOTICE 'Successfully inserted ticket with short_id: % (attempt %)', v_short_id, v_attempt;
      
    EXCEPTION WHEN unique_violation THEN
      -- 如果冲突，重试
      RAISE WARNING 'short_id conflict: % (attempt %), retrying...', v_short_id, v_attempt;
      CONTINUE;
    END;
  END LOOP;
  
  IF NOT v_success THEN
    RAISE EXCEPTION 'Failed to insert ticket after % attempts', p_max_retries;
  END IF;
  
  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_ticket_with_retry IS 'Example function for inserting tickets with short_id retry logic. Application code should implement similar retry mechanism.';

-- ========================================
-- Step 5: 添加注释说明
-- ========================================

COMMENT ON COLUMN tickets.short_id IS 'Unique ticket identifier (10-character nanoid). Generated with retry logic to handle collisions.';

-- ========================================
-- 所有迁移完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All Migrations Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 1/5: User System Unification ✓';
  RAISE NOTICE 'Migration 2/5: RLS Policies Rebuilt ✓';
  RAISE NOTICE 'Migration 3/5: Tickets Table Refactored ✓';
  RAISE NOTICE 'Migration 4/5: Status Fields ENUM ✓';
  RAISE NOTICE 'Migration 5/5: Short ID Refactored ✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Run test script: 20250115_test_migration.sql';
  RAISE NOTICE '2. Update application code (see CODE_UPDATE_GUIDE.md)';
  RAISE NOTICE '3. Test purchase and redemption flows';
  RAISE NOTICE '========================================';
END $$;

