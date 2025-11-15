-- ============================================================================
-- 为 admin_invite_codes 表添加 max_events 字段（如果不存在）
-- ============================================================================
-- 用途：
--   如果 admin_invite_codes 表缺少 max_events 字段，添加它
--   默认值为 10，与表结构定义一致
--
-- 使用方法：
--   在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- ============================================================================

-- 检查并添加 max_events 字段（如果不存在）
DO $$
BEGIN
  -- 检查字段是否存在
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_invite_codes'
      AND column_name = 'max_events'
  ) THEN
    -- 添加 max_events 字段
    ALTER TABLE admin_invite_codes
    ADD COLUMN max_events INTEGER DEFAULT 10;
    
    RAISE NOTICE '✅ 已添加 max_events 字段到 admin_invite_codes 表';
  ELSE
    RAISE NOTICE 'ℹ️  max_events 字段已存在，无需添加';
  END IF;
END $$;

-- 验证字段是否添加成功
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_invite_codes'
      AND column_name = 'max_events'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '✅ 验证成功: max_events 字段存在于 admin_invite_codes 表';
  ELSE
    RAISE WARNING '⚠️  验证失败: max_events 字段不存在于 admin_invite_codes 表';
  END IF;
END $$;

