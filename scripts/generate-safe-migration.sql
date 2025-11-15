-- ========================================
-- 生成安全的迁移脚本
-- ========================================
-- 此脚本基于审计结果生成
-- 请先运行 comprehensive-merchant-audit.sql 收集信息
-- 然后根据结果调整此脚本

-- ========================================
-- 步骤 1: 备份当前数据（可选，但强烈推荐）
-- ========================================
-- 创建备份表
CREATE TABLE IF NOT EXISTS merchants_backup_20250116 AS 
SELECT * FROM merchants;

-- ========================================
-- 步骤 2: 禁用相关表的 RLS（临时）
-- ========================================
-- 注意：这需要超级用户权限，如果无法执行，跳过此步骤
-- ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 步骤 3: 删除所有依赖的 RLS 策略
-- ========================================
-- 根据审计结果，删除所有依赖的策略
-- 请根据 comprehensive-merchant-audit.sql 的结果替换下面的策略名

-- 示例：删除策略（请根据实际审计结果修改）
DO $$
DECLARE
    policy_record RECORD;
    policies_to_drop TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- 收集所有需要删除的策略
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE (qual::text LIKE '%owner_supabase_uid%'
               OR qual::text LIKE '%owner_user_id%'
               OR with_check::text LIKE '%owner_supabase_uid%'
               OR with_check::text LIKE '%owner_user_id%')
    LOOP
        policies_to_drop := policies_to_drop || format('%I.%I.%I', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname);
        
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
        
        RAISE NOTICE '已删除策略: %.%.%', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname;
    END LOOP;
    
    IF array_length(policies_to_drop, 1) IS NOT NULL THEN
        RAISE NOTICE '总共删除了 % 个策略', array_length(policies_to_drop, 1);
    ELSE
        RAISE NOTICE '没有找到需要删除的策略';
    END IF;
END $$;

-- ========================================
-- 步骤 4: 删除索引（如果存在）
-- ========================================
DROP INDEX IF EXISTS idx_merchants_owner_supabase_uid;
DROP INDEX IF EXISTS idx_merchants_owner_user_id;

-- ========================================
-- 步骤 5: 添加新列（如果不存在）
-- ========================================
ALTER TABLE merchants 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ========================================
-- 步骤 6: 迁移数据
-- ========================================
-- 将 contact_email 迁移到 email
UPDATE merchants 
SET email = contact_email 
WHERE email IS NULL 
  AND contact_email IS NOT NULL;

-- 记录迁移结果
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM merchants
    WHERE email IS NOT NULL;
    
    RAISE NOTICE '已迁移 % 条记录的 email', migrated_count;
END $$;

-- ========================================
-- 步骤 7: 删除旧列（使用 CASCADE 自动处理依赖）
-- ========================================
-- 注意：CASCADE 会自动删除依赖对象，请谨慎使用
-- 如果不想使用 CASCADE，请先手动删除所有依赖

-- 方法 1: 使用 CASCADE（自动删除依赖）
-- ALTER TABLE merchants 
--   DROP COLUMN IF EXISTS owner_supabase_uid CASCADE,
--   DROP COLUMN IF EXISTS owner_user_id CASCADE,
--   DROP COLUMN IF EXISTS contact_email CASCADE,
--   DROP COLUMN IF EXISTS contact_phone CASCADE;

-- 方法 2: 不使用 CASCADE（更安全，但需要先删除所有依赖）
ALTER TABLE merchants 
  DROP COLUMN IF EXISTS owner_supabase_uid,
  DROP COLUMN IF EXISTS owner_user_id,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

-- ========================================
-- 步骤 8: 添加约束和索引
-- ========================================
-- 清理重复的 email（如果有）
UPDATE merchants 
SET email = email || '_' || id::text
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
        FROM merchants
        WHERE email IS NOT NULL
    ) t WHERE rn > 1
);

-- 添加唯一约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'merchants'::regclass 
        AND conname LIKE '%email%' 
        AND contype = 'u'
    ) THEN
        ALTER TABLE merchants 
        ADD CONSTRAINT merchants_email_unique UNIQUE (email);
        
        RAISE NOTICE '已添加 email 唯一约束';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '添加 email 唯一约束时出错: %', SQLERRM;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);

-- ========================================
-- 步骤 9: 重新启用 RLS（如果之前禁用了）
-- ========================================
-- ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 步骤 10: 验证迁移结果
-- ========================================
SELECT 
    '=== 迁移后验证 ===' AS section;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'merchants'
    AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    COUNT(*) AS total_merchants,
    COUNT(email) AS has_email,
    COUNT(password_hash) AS has_password_hash
FROM merchants;

