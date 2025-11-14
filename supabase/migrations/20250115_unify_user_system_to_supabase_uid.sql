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
-- Step 6: 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User System Unification Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tables now use supabase_uid as primary user identifier';
  RAISE NOTICE 'Old user_id fields are marked as DEPRECATED';
  RAISE NOTICE 'Next: Run RLS policy migration';
  RAISE NOTICE '========================================';
END $$;

