-- 修复现有数据库架构
-- 安全地添加缺失的字段和索引
-- 在 Supabase SQL Editor 中运行此文件

-- ========================================
-- 检查并添加缺失的字段
-- ========================================

-- 为订单表添加用户和商家关联字段
DO $$
BEGIN
    -- 添加 user_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
        ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added user_id column to orders table';
    ELSE
        RAISE NOTICE 'user_id column already exists in orders table';
    END IF;

    -- 添加 merchant_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'merchant_id') THEN
        ALTER TABLE orders ADD COLUMN merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added merchant_id column to orders table';
    ELSE
        RAISE NOTICE 'merchant_id column already exists in orders table';
    END IF;

    -- 添加 merchant_email 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'merchant_email') THEN
        ALTER TABLE orders ADD COLUMN merchant_email TEXT;
        RAISE NOTICE 'Added merchant_email column to orders table';
    ELSE
        RAISE NOTICE 'merchant_email column already exists in orders table';
    END IF;
END $$;

-- 为票据表添加用户和商家关联字段
DO $$
BEGIN
    -- 添加 user_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
        ALTER TABLE tickets ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added user_id column to tickets table';
    ELSE
        RAISE NOTICE 'user_id column already exists in tickets table';
    END IF;

    -- 添加 merchant_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'merchant_id') THEN
        ALTER TABLE tickets ADD COLUMN merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added merchant_id column to tickets table';
    ELSE
        RAISE NOTICE 'merchant_id column already exists in tickets table';
    END IF;

    -- 添加 merchant_email 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'merchant_email') THEN
        ALTER TABLE tickets ADD COLUMN merchant_email TEXT;
        RAISE NOTICE 'Added merchant_email column to tickets table';
    ELSE
        RAISE NOTICE 'merchant_email column already exists in tickets table';
    END IF;

    -- 添加 verified_at 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'verified_at') THEN
        ALTER TABLE tickets ADD COLUMN verified_at TIMESTAMPTZ;
        RAISE NOTICE 'Added verified_at column to tickets table';
    ELSE
        RAISE NOTICE 'verified_at column already exists in tickets table';
    END IF;
END $$;

-- ========================================
-- 创建缺失的索引
-- ========================================

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);

-- 票据表索引
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_merchant_id ON tickets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_verified_at ON tickets(verified_at);

-- 商家表索引
CREATE INDEX IF NOT EXISTS idx_merchants_contact_email ON merchants(contact_email);

-- ========================================
-- 更新现有数据
-- ========================================

-- 更新现有票据，尝试通过邮箱匹配用户
UPDATE tickets 
SET user_id = (
    SELECT u.id 
    FROM users u 
    WHERE u.email = tickets.holder_email 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 更新现有订单，尝试通过邮箱匹配用户
UPDATE orders 
SET user_id = (
    SELECT u.id 
    FROM users u 
    WHERE u.email = orders.customer_email 
    LIMIT 1
)
WHERE user_id IS NULL;

-- ========================================
-- 插入测试邀请码（如果不存在）
-- ========================================

INSERT INTO admin_invite_codes (code, max_events, is_active, expires_at)
SELECT 
    'INV_MH59SBGD_D20Z7C',
    10,
    TRUE,
    '2025-11-23T19:54:38.461Z'::TIMESTAMPTZ
WHERE NOT EXISTS (
    SELECT 1 FROM admin_invite_codes WHERE code = 'INV_MH59SBGD_D20Z7C'
);

-- ========================================
-- 完成提示
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema fix completed successfully!';
    RAISE NOTICE 'Added missing columns: user_id, merchant_id, merchant_email, verified_at';
    RAISE NOTICE 'Created missing indexes for better performance';
    RAISE NOTICE 'Updated existing data to link users by email';
    RAISE NOTICE 'Test invite code available: INV_MH59SBGD_D20Z7C';
    RAISE NOTICE 'Database is now ready for merchant registration!';
END $$;
