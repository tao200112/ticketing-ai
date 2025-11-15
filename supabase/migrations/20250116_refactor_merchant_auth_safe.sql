-- ========================================
-- 商家认证系统重构 - 安全迁移脚本
-- ========================================
-- 基于实际数据库结构创建
-- 执行前请确保已备份数据

BEGIN;

-- ========================================
-- 步骤 1: 创建备份表
-- ========================================
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS merchants_backup_20250116 AS 
    SELECT * FROM merchants;
    
    RAISE NOTICE '✅ 已创建备份表: merchants_backup_20250116';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '创建备份表时出错: %', SQLERRM;
END $$;

-- ========================================
-- 步骤 2: 动态删除所有依赖的 RLS 策略
-- ========================================
DO $$
DECLARE
    policy_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- 查找并删除所有依赖 owner_supabase_uid 或 owner_user_id 的策略
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE (qual::text LIKE '%owner_supabase_uid%'
               OR qual::text LIKE '%owner_user_id%'
               OR with_check::text LIKE '%owner_supabase_uid%'
               OR with_check::text LIKE '%owner_user_id%')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename
            );
            deleted_count := deleted_count + 1;
            RAISE NOTICE '已删除策略: %.%.%', 
                policy_record.schemaname, 
                policy_record.tablename, 
                policy_record.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '删除策略时出错: %.%.% - %', 
                    policy_record.schemaname, 
                    policy_record.tablename, 
                    policy_record.policyname,
                    SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ 总共删除了 % 个策略', deleted_count;
END $$;

-- ========================================
-- 步骤 3: 删除索引（如果存在）
-- ========================================
DO $$
BEGIN
    DROP INDEX IF EXISTS idx_merchants_owner_supabase_uid;
    DROP INDEX IF EXISTS idx_merchants_owner_user_id;
    RAISE NOTICE '✅ 已删除旧索引';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '删除索引时出错: %', SQLERRM;
END $$;

-- ========================================
-- 步骤 4: 添加新列（如果不存在）
-- ========================================
DO $$
BEGIN
    -- 添加 email 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE merchants ADD COLUMN email TEXT;
        RAISE NOTICE '✅ 已添加 email 列';
    ELSE
        RAISE NOTICE 'ℹ️  email 列已存在';
    END IF;

    -- 添加 password_hash 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'password_hash'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE merchants ADD COLUMN password_hash TEXT;
        RAISE NOTICE '✅ 已添加 password_hash 列';
    ELSE
        RAISE NOTICE 'ℹ️  password_hash 列已存在';
    END IF;
END $$;

-- ========================================
-- 步骤 5: 迁移数据（contact_email -> email）
-- ========================================
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    -- 将 contact_email 迁移到 email
    UPDATE merchants 
    SET email = contact_email 
    WHERE email IS NULL 
      AND contact_email IS NOT NULL;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ 已迁移 % 条记录的 email', migrated_count;
    
    -- 检查是否有未迁移的记录
    SELECT COUNT(*) INTO migrated_count
    FROM merchants
    WHERE email IS NULL AND contact_email IS NOT NULL;
    
    IF migrated_count > 0 THEN
        RAISE WARNING '⚠️  仍有 % 条记录未迁移 email', migrated_count;
    END IF;
END $$;

-- ========================================
-- 步骤 6: 删除旧列
-- ========================================
DO $$
BEGIN
    -- 删除 owner_supabase_uid
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'owner_supabase_uid'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE merchants DROP COLUMN owner_supabase_uid;
        RAISE NOTICE '✅ 已删除 owner_supabase_uid 列';
    END IF;

    -- 删除 owner_user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'owner_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE merchants DROP COLUMN owner_user_id;
        RAISE NOTICE '✅ 已删除 owner_user_id 列';
    END IF;

    -- 删除 contact_email
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'contact_email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE merchants DROP COLUMN contact_email;
        RAISE NOTICE '✅ 已删除 contact_email 列';
    END IF;

    -- 删除 contact_phone（可选，如果需要保留可以注释掉）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchants' 
        AND column_name = 'contact_phone'
        AND table_schema = 'public'
    ) THEN
        -- 如果需要保留 contact_phone，注释掉下面这行
        -- ALTER TABLE merchants DROP COLUMN contact_phone;
        RAISE NOTICE 'ℹ️  contact_phone 列保留（如需删除请取消注释）';
    END IF;
END $$;

-- ========================================
-- 步骤 7: 清理重复的 email 并添加唯一约束
-- ========================================
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- 检查是否有重复的 email
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as cnt
        FROM merchants
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        -- 清理重复：为重复的 email 添加 ID 后缀
        UPDATE merchants 
        SET email = email || '_' || id::text
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
                FROM merchants
                WHERE email IS NOT NULL
            ) t WHERE rn > 1
        );
        RAISE NOTICE '✅ 已清理 % 个重复的 email', duplicate_count;
    END IF;

    -- 添加唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'merchants'::regclass 
        AND conname LIKE '%email%' 
        AND contype = 'u'
    ) THEN
        ALTER TABLE merchants 
        ADD CONSTRAINT merchants_email_unique UNIQUE (email);
        RAISE NOTICE '✅ 已添加 email 唯一约束';
    ELSE
        RAISE NOTICE 'ℹ️  email 唯一约束已存在';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  添加 email 唯一约束时出错: %', SQLERRM;
END $$;

-- ========================================
-- 步骤 8: 添加索引
-- ========================================
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
    RAISE NOTICE '✅ 已创建 email 索引';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '创建索引时出错: %', SQLERRM;
END $$;

-- ========================================
-- 步骤 9: 添加注释
-- ========================================
COMMENT ON TABLE merchants IS '商家表 - 完全独立于 Supabase Auth 的认证系统';
COMMENT ON COLUMN merchants.email IS '商家邮箱 - 用于登录，必须唯一';
COMMENT ON COLUMN merchants.password_hash IS '密码哈希 - 使用 bcrypt 加密';
COMMENT ON COLUMN merchants.name IS '商家名称';

-- ========================================
-- 步骤 10: 验证迁移结果
-- ========================================
DO $$
DECLARE
    total_count INTEGER;
    email_count INTEGER;
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM merchants;
    SELECT COUNT(*) INTO email_count FROM merchants WHERE email IS NOT NULL;
    SELECT COUNT(*) INTO backup_count FROM merchants_backup_20250116;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '迁移验证结果:';
    RAISE NOTICE '  总商家数: %', total_count;
    RAISE NOTICE '  有 email 的商家: %', email_count;
    RAISE NOTICE '  备份记录数: %', backup_count;
    RAISE NOTICE '========================================';
    
    IF total_count = backup_count THEN
        RAISE NOTICE '✅ 数据完整性验证通过';
    ELSE
        RAISE WARNING '⚠️  数据数量不匹配，请检查';
    END IF;
END $$;

COMMIT;

-- ========================================
-- 迁移完成
-- ========================================
-- 如果遇到问题，可以使用以下命令回滚：
-- DROP TABLE IF EXISTS merchants;
-- ALTER TABLE merchants_backup_20250116 RENAME TO merchants;

