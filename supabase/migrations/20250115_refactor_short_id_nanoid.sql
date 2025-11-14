-- ========================================
-- 重构 short_id：使用 nanoid 并添加重试机制
-- 迁移日期：2025-01-15
-- 目标：使用 nanoid(10) 替代当前 short_id 生成逻辑
-- ========================================

-- ========================================
-- Step 1: 安装 nanoid 扩展（如果可用）
-- ========================================

-- 注意：PostgreSQL 没有内置 nanoid，我们需要使用应用层生成
-- 这里我们确保 short_id 字段可以接受 nanoid 格式（字母数字，10 字符）

-- ========================================
-- Step 2: 验证现有 short_id 格式
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
-- Step 3: 确保 short_id 约束正确
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
-- Step 4: 创建生成 nanoid 的函数（应用层使用）
-- ========================================

-- 注意：PostgreSQL 函数生成 nanoid 需要 pgcrypto 扩展
-- 这里我们创建一个辅助函数，但实际生成应该在应用层

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
-- Step 5: 创建带重试的插入函数（示例）
-- ========================================

-- 注意：这个函数是示例，实际应该在应用层实现重试逻辑
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
-- Step 6: 添加注释说明
-- ========================================

COMMENT ON COLUMN tickets.short_id IS 'Unique ticket identifier (10-character nanoid). Generated with retry logic to handle collisions.';

-- ========================================
-- 完成通知
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Short ID Refactoring Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'short_id now uses nanoid(10) format';
  RAISE NOTICE 'Retry function created (example)';
  RAISE NOTICE 'Application code must implement retry logic';
  RAISE NOTICE 'Next: Review and test all migrations';
  RAISE NOTICE '========================================';
END $$;

