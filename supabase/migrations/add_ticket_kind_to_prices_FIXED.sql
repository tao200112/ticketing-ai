-- ========================================
-- 添加 ticket_kind 列到 prices 表（修复版）
-- 确保列存在，兼容已存在的表结构
-- ========================================

-- 1. 检查并添加 ticket_kind 列
DO $$
BEGIN
    -- 检查 column 是否存在
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'prices'
        AND column_name = 'ticket_kind'
    ) THEN
        -- 添加列，允许 NULL（因为已有数据可能没有这个值）
        ALTER TABLE prices
        ADD COLUMN ticket_kind TEXT;
        
        -- 添加 CHECK 约束（如果列不存在则添加约束）
        ALTER TABLE prices
        ADD CONSTRAINT prices_ticket_kind_check 
        CHECK (ticket_kind IS NULL OR ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink', 'combo'));
        
        RAISE NOTICE 'ticket_kind column added to prices table';
    ELSE
        RAISE NOTICE 'ticket_kind column already exists in prices table';
    END IF;
END $$;

-- 2. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_prices_ticket_kind ON prices(ticket_kind);

-- 3. 验证列已添加
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'prices'
AND column_name = 'ticket_kind';

-- 4. 显示迁移结果
SELECT 
    'Migration completed' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'prices'
            AND column_name = 'ticket_kind'
        ) THEN 'ticket_kind column exists'
        ELSE 'ticket_kind column NOT found'
    END as result;

