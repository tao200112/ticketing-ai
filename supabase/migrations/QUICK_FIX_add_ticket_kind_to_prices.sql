-- ========================================
-- 快速修复：添加 ticket_kind 列到 prices 表
-- 在 Supabase SQL Editor 中直接运行此脚本
-- ========================================

-- 检查并添加 ticket_kind 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'prices'
        AND column_name = 'ticket_kind'
    ) THEN
        -- 先添加列（允许 NULL）
        ALTER TABLE prices
        ADD COLUMN ticket_kind TEXT;
        
        RAISE NOTICE '✅ ticket_kind column added to prices table';
    ELSE
        RAISE NOTICE 'ℹ️ ticket_kind column already exists in prices table';
    END IF;
END $$;

-- 添加 CHECK 约束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'prices_ticket_kind_check'
    ) THEN
        ALTER TABLE prices
        ADD CONSTRAINT prices_ticket_kind_check 
        CHECK (ticket_kind IS NULL OR ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink'));
        
        RAISE NOTICE '✅ ticket_kind CHECK constraint added';
    ELSE
        RAISE NOTICE 'ℹ️ ticket_kind CHECK constraint already exists';
    END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_prices_ticket_kind ON prices(ticket_kind);

-- 验证列已添加
SELECT 
    'Migration result' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'prices'
            AND column_name = 'ticket_kind'
        ) THEN '✅ ticket_kind column EXISTS'
        ELSE '❌ ticket_kind column NOT FOUND'
    END as result,
    COUNT(*) as total_prices
FROM prices;

