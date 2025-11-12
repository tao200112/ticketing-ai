-- ========================================
-- 使 merchants 表独立，不强制依赖 users 表
-- ========================================

-- 修改 merchants 表，使 owner_user_id 可选（允许为 NULL）
-- 这样 merchants 表可以独立存在，不依赖 users 表
DO $$
BEGIN
  -- 检查 owner_user_id 列是否存在 NOT NULL 约束
  -- 如果存在，删除它
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'merchants' 
    AND column_name = 'owner_user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE merchants ALTER COLUMN owner_user_id DROP NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- 如果操作失败，记录但不中断
    RAISE NOTICE 'Could not modify owner_user_id column: %', SQLERRM;
END $$;

-- 修改外键约束，允许 owner_user_id 为 NULL
-- 如果外键约束不允许 NULL，需要先删除再重新创建
DO $$
BEGIN
  -- 检查是否存在外键约束
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'merchants' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%owner_user_id%'
  ) THEN
    -- 删除现有的外键约束
    ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_owner_user_id_fkey;
    
    -- 重新创建外键约束，允许 NULL
    ALTER TABLE merchants 
      ADD CONSTRAINT merchants_owner_user_id_fkey 
      FOREIGN KEY (owner_user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify foreign key constraint: %', SQLERRM;
END $$;

-- 添加注释说明
COMMENT ON COLUMN merchants.owner_user_id IS '可选的用户ID关联，允许为NULL，使merchants表可以独立存在。如果为NULL，merchant完全独立于users表。';

-- 确保 contact_email 字段可以独立使用，不依赖 users 表的 email
-- contact_email 已经是独立的字段，不需要修改

-- 注意：根据需求，允许同一个邮箱在 users 和 merchants 中同时存在
-- 所以 contact_email 不添加唯一约束，允许重复

