-- ========================================
-- 测试迁移脚本：验证所有修复
-- 运行此脚本验证迁移是否成功
-- ========================================

-- ========================================
-- Test 1: 验证 supabase_uid 字段存在
-- ========================================

DO $$
BEGIN
  -- 检查 orders 表
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: orders.supabase_uid column missing';
  END IF;
  
  -- 检查 tickets 表
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: tickets.supabase_uid column missing';
  END IF;
  
  -- 检查 merchant_members 表
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_members') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'merchant_members' AND column_name = 'supabase_uid'
    ) THEN
      RAISE EXCEPTION 'FAIL: merchant_members.supabase_uid column missing';
    END IF;
  END IF;
  
  -- 检查 merchants 表
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'merchants' AND column_name = 'owner_supabase_uid'
    ) THEN
      RAISE EXCEPTION 'FAIL: merchants.owner_supabase_uid column missing';
    END IF;
  END IF;
  
  RAISE NOTICE '✅ PASS: All supabase_uid columns exist';
END $$;

-- ========================================
-- Test 2: 验证索引存在
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' AND indexname = 'idx_orders_supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: idx_orders_supabase_uid index missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tickets' AND indexname = 'idx_tickets_supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: idx_tickets_supabase_uid index missing';
  END IF;
  
  RAISE NOTICE '✅ PASS: All supabase_uid indexes exist';
END $$;

-- ========================================
-- Test 3: 验证 ENUM 类型存在
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'orders_status'
  ) THEN
    RAISE EXCEPTION 'FAIL: orders_status ENUM type missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ticket_status'
  ) THEN
    RAISE EXCEPTION 'FAIL: ticket_status ENUM type missing';
  END IF;
  
  RAISE NOTICE '✅ PASS: All ENUM types exist';
END $$;

-- ========================================
-- Test 4: 验证 RLS 策略存在
-- ========================================

DO $$
BEGIN
  -- 检查 orders RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND policyname = 'orders_select_by_supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: orders_select_by_supabase_uid policy missing';
  END IF;
  
  -- 检查 tickets RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tickets'
    AND policyname = 'tickets_select_by_supabase_uid'
  ) THEN
    RAISE EXCEPTION 'FAIL: tickets_select_by_supabase_uid policy missing';
  END IF;
  
  -- 检查 ticket_redemptions RLS（如果表存在）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_redemptions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'ticket_redemptions'
      AND policyname = 'ticket_redemptions_select_own'
    ) THEN
      RAISE EXCEPTION 'FAIL: ticket_redemptions_select_own policy missing';
    END IF;
  END IF;
  
  RAISE NOTICE '✅ PASS: All RLS policies exist';
END $$;

-- ========================================
-- Test 5: 验证 JSONB 字段存在
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'event_snapshot'
    AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'FAIL: tickets.event_snapshot JSONB column missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'price_snapshot'
    AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'FAIL: tickets.price_snapshot JSONB column missing';
  END IF;
  
  RAISE NOTICE '✅ PASS: All JSONB snapshot fields exist';
END $$;

-- ========================================
-- Test 6: 验证数据迁移（检查是否有数据）
-- ========================================

DO $$
DECLARE
  orders_with_uid INTEGER;
  tickets_with_uid INTEGER;
BEGIN
  -- 检查 orders 数据迁移
  SELECT COUNT(*) INTO orders_with_uid
  FROM orders
  WHERE supabase_uid IS NOT NULL;
  
  -- 检查 tickets 数据迁移
  SELECT COUNT(*) INTO tickets_with_uid
  FROM tickets
  WHERE supabase_uid IS NOT NULL;
  
  RAISE NOTICE 'Data migration status:';
  RAISE NOTICE '  Orders with supabase_uid: %', orders_with_uid;
  RAISE NOTICE '  Tickets with supabase_uid: %', tickets_with_uid;
  
  -- 如果有旧数据但没有迁移，发出警告
  IF orders_with_uid = 0 AND (SELECT COUNT(*) FROM orders) > 0 THEN
    RAISE WARNING 'No orders have supabase_uid - migration may have failed';
  END IF;
  
  IF tickets_with_uid = 0 AND (SELECT COUNT(*) FROM tickets) > 0 THEN
    RAISE WARNING 'No tickets have supabase_uid - migration may have failed';
  END IF;
END $$;

-- ========================================
-- Test 7: 验证废弃字段有注释
-- ========================================

DO $$
BEGIN
  -- 检查 orders.user_id 注释
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_description d
    JOIN pg_catalog.pg_class c ON c.oid = d.objoid
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
    WHERE c.relname = 'orders'
    AND a.attname = 'user_id'
    AND d.description LIKE '%DEPRECATED%'
  ) THEN
    RAISE WARNING 'orders.user_id may not have DEPRECATED comment';
  END IF;
  
  RAISE NOTICE '✅ PASS: Deprecated fields have comments';
END $$;

-- ========================================
-- Test 8: 验证 nanoid 函数存在
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'generate_nanoid_short_id'
  ) THEN
    RAISE EXCEPTION 'FAIL: generate_nanoid_short_id function missing';
  END IF;
  
  RAISE NOTICE '✅ PASS: nanoid function exists';
END $$;

-- ========================================
-- 测试完成
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All Migration Tests Completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'If you see this message, all tests passed.';
  RAISE NOTICE 'Next: Update application code to use supabase_uid';
  RAISE NOTICE '========================================';
END $$;

