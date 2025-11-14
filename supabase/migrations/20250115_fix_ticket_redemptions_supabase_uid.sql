-- ========================================
-- 修复 ticket_redemptions 表：使用 supabase_uid
-- 迁移日期：2025-01-15
-- 目标：将 user_id 和 redeemed_by 迁移到 supabase_uid
-- ========================================

-- ========================================
-- Step 1: 添加 supabase_uid 字段（如果不存在）
-- ========================================

-- Ticket redemptions 表
ALTER TABLE ticket_redemptions 
ADD COLUMN IF NOT EXISTS supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ticket_redemptions 
ADD COLUMN IF NOT EXISTS redeemed_by_supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Tickets 表（添加 redeemed_by_supabase_uid 字段）
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS redeemed_by_supabase_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets.redeemed_by_supabase_uid IS 'Supabase Auth UID of merchant staff who redeemed this ticket (replaces redeemed_by)';

-- ========================================
-- Step 2: 迁移现有数据
-- ========================================

-- 迁移 user_id -> supabase_uid
DO $$
BEGIN
  -- 如果 users 表有 supabase_uid 字段，使用它
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
  ELSE
    -- 否则通过 email 匹配 auth.users
    -- 注意：ticket_redemptions 可能没有直接的 email，需要通过关联的 ticket 获取
    UPDATE ticket_redemptions tr
    SET supabase_uid = au.id
    FROM tickets t
    JOIN auth.users au ON au.email = t.holder_email
    WHERE tr.ticket_id = t.id
      AND tr.user_id IS NOT NULL
      AND tr.supabase_uid IS NULL
      AND au.id IS NOT NULL;
  END IF;
  
  RAISE NOTICE 'Migrated ticket_redemptions.supabase_uid from user_id';
END $$;

-- 迁移 redeemed_by -> redeemed_by_supabase_uid
DO $$
BEGIN
  -- 如果 redeemed_by 是 UUID 类型（引用 users.id）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ticket_redemptions' 
    AND column_name = 'redeemed_by'
    AND data_type = 'uuid'
  ) THEN
    -- 通过 users 表匹配
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'supabase_uid'
    ) THEN
      UPDATE ticket_redemptions tr
      SET redeemed_by_supabase_uid = u.supabase_uid
      FROM users u
      WHERE tr.redeemed_by = u.id::uuid
        AND tr.redeemed_by_supabase_uid IS NULL
        AND u.supabase_uid IS NOT NULL;
    END IF;
  END IF;
  
  RAISE NOTICE 'Migrated ticket_redemptions.redeemed_by_supabase_uid from redeemed_by';
END $$;

-- ========================================
-- Step 3: 创建索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_supabase_uid ON ticket_redemptions(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_ticket_redemptions_redeemed_by_supabase_uid ON ticket_redemptions(redeemed_by_supabase_uid);
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_by_supabase_uid ON tickets(redeemed_by_supabase_uid);

-- ========================================
-- Step 4: 标记废弃字段
-- ========================================

COMMENT ON COLUMN ticket_redemptions.user_id IS 'DEPRECATED: Use supabase_uid instead. This field is kept for backward compatibility only.';
COMMENT ON COLUMN ticket_redemptions.redeemed_by IS 'DEPRECATED: Use redeemed_by_supabase_uid instead. This field is kept for backward compatibility only.';

-- 标记 tickets 表的 redeemed_by 字段为废弃
COMMENT ON COLUMN tickets.redeemed_by IS 'DEPRECATED: Use redeemed_by_supabase_uid instead. This field is kept for backward compatibility only.';

-- ========================================
-- Step 5: 更新 RLS 策略
-- ========================================

-- 删除旧的 RLS 策略（如果存在）
DROP POLICY IF EXISTS "Users can view redemptions of their own tickets" ON ticket_redemptions;
DROP POLICY IF EXISTS "Merchant staff can insert redemptions" ON ticket_redemptions;
DROP POLICY IF EXISTS "ticket_redemptions_select_own" ON ticket_redemptions;
DROP POLICY IF EXISTS "ticket_redemptions_insert_merchant" ON ticket_redemptions;
DROP POLICY IF EXISTS "ticket_redemptions_select_merchant" ON ticket_redemptions;
DROP POLICY IF EXISTS "ticket_redemptions_insert_merchant_staff" ON ticket_redemptions;

-- 确保 RLS 已启用
ALTER TABLE ticket_redemptions ENABLE ROW LEVEL SECURITY;

-- 创建新的 RLS 策略
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

-- ========================================
-- 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ticket Redemptions Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added supabase_uid and redeemed_by_supabase_uid fields';
  RAISE NOTICE 'Migrated existing data';
  RAISE NOTICE 'Updated RLS policies';
  RAISE NOTICE 'Next: Update API code to use supabase_uid';
  RAISE NOTICE '========================================';
END $$;

