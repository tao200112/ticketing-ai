-- ========================================
-- 更新 ticket_kind 约束以支持 'combo' 值
-- ========================================

-- 如果约束已存在，先删除它
DO $$
BEGIN
    -- 检查约束是否存在
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'prices_ticket_kind_check'
        AND table_name = 'prices'
    ) THEN
        -- 删除旧约束
        ALTER TABLE prices
        DROP CONSTRAINT prices_ticket_kind_check;
        
        RAISE NOTICE 'Old constraint dropped';
    END IF;
END $$;

-- 添加新约束（包含 combo）
ALTER TABLE prices
ADD CONSTRAINT prices_ticket_kind_check 
CHECK (ticket_kind IS NULL OR ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink', 'combo'));

-- 验证约束已更新
SELECT 
    'Constraint updated' as status,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'prices_ticket_kind_check';

