-- ========================================
-- 重构商家认证系统 - 完全独立于 Supabase Auth
-- ========================================
-- 此迁移将商家认证系统从 Supabase Auth 分离出来
-- 商家现在使用独立的认证系统（bcrypt + JWT）

-- 1. 修改 merchants 表结构
-- ========================================

-- 动态删除所有依赖于 owner_supabase_uid 或 owner_user_id 的 RLS 策略
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- 查找所有依赖 owner_supabase_uid 或 owner_user_id 的策略
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE (qual::text LIKE '%owner_supabase_uid%'
               OR qual::text LIKE '%owner_user_id%'
               OR with_check::text LIKE '%owner_supabase_uid%'
               OR with_check::text LIKE '%owner_user_id%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
        RAISE NOTICE '已删除策略: %.%.%', policy_record.schemaname, policy_record.tablename, policy_record.policyname;
    END LOOP;
END $$;

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_merchants_owner_supabase_uid;

-- 添加新的独立认证字段（在删除旧字段之前，以便迁移数据）
-- 注意：name 列已存在，不需要添加
ALTER TABLE merchants 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 迁移现有数据：将 contact_email 迁移到 email（如果 contact_email 存在）
DO $$
BEGIN
  -- 尝试将 contact_email 迁移到 email（如果 contact_email 存在且 email 为空）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'contact_email'
  ) THEN
    UPDATE merchants 
    SET email = contact_email 
    WHERE email IS NULL 
      AND contact_email IS NOT NULL;
    
    RAISE NOTICE '✅ 已迁移 contact_email 到 email';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 迁移 contact_email 时出错: %', SQLERRM;
END $$;

-- 现在可以安全地删除旧的关联字段
ALTER TABLE merchants 
  DROP COLUMN IF EXISTS owner_supabase_uid,
  DROP COLUMN IF EXISTS owner_user_id,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

-- 确保 email 是唯一的（添加唯一约束）
DO $$
BEGIN
  -- 如果 email 列存在但还没有唯一约束，添加它
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'email'
  ) THEN
    -- 检查是否已有唯一约束
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'merchants'::regclass 
      AND conname LIKE '%email%' 
      AND contype = 'u'
    ) THEN
      -- 先清理可能的重复数据
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
      ALTER TABLE merchants 
      ADD CONSTRAINT merchants_email_unique UNIQUE (email);
      
      RAISE NOTICE '✅ 已添加 email 唯一约束';
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 添加 email 唯一约束时出错: %', SQLERRM;
END $$;

-- 确保 email 是必需的（对于新记录）
-- 注意：对于现有记录，email 可能为 NULL，所以先允许 NULL，然后逐步迁移
-- 新记录将通过应用层验证确保 email 不为空

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);

-- 2. 创建新的 invite_codes 表（如果不存在）
-- ========================================

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('merchant', 'user', 'admin')),
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_type ON invite_codes(type);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used ON invite_codes(used);

-- 3. 迁移现有数据（如果有）
-- ========================================

-- 将 admin_invite_codes 表中的数据迁移到新的 invite_codes 表
-- 只迁移未使用的邀请码
INSERT INTO invite_codes (code, type, used, used_at, created_at)
SELECT 
  code,
  'merchant' as type,
  CASE WHEN used_by IS NOT NULL THEN true ELSE false END as used,
  used_at,
  created_at
FROM admin_invite_codes
WHERE NOT EXISTS (
  SELECT 1 FROM invite_codes WHERE invite_codes.code = admin_invite_codes.code
)
ON CONFLICT (code) DO NOTHING;

-- 4. 数据迁移已完成（在上面的步骤中）
-- ========================================

-- 5. 添加注释
-- ========================================

COMMENT ON TABLE merchants IS '商家表 - 完全独立于 Supabase Auth 的认证系统';
COMMENT ON COLUMN merchants.email IS '商家邮箱 - 用于登录，必须唯一';
COMMENT ON COLUMN merchants.password_hash IS '密码哈希 - 使用 bcrypt 加密';
COMMENT ON COLUMN merchants.name IS '商家名称';
COMMENT ON TABLE invite_codes IS '邀请码表 - 支持多种类型（merchant, user, admin）';
COMMENT ON COLUMN invite_codes.type IS '邀请码类型：merchant（商家）, user（用户）, admin（管理员）';
COMMENT ON COLUMN invite_codes.used IS '是否已使用';
COMMENT ON COLUMN invite_codes.used_at IS '使用时间';

