-- ========================================
-- 清理旧表和备份表
-- 删除不需要的旧表和备份表
-- ========================================
-- 
-- 注意：执行此脚本会删除以下表：
-- - profiles (旧用户表)
-- - users_legacy_backup (用户备份表)
-- - event_prices (旧价格表，如果有的话)
-- ========================================

BEGIN;

-- 删除旧表 profiles（如果存在）
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 删除用户备份表（如果存在）
DROP TABLE IF EXISTS public.users_legacy_backup CASCADE;

-- 删除旧的价格表 event_prices（如果存在且与 prices 表重复）
-- 注意：先检查 event_prices 表是否存在，如果不存在则跳过
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_prices'
    ) THEN
        -- 检查是否有数据需要迁移
        IF EXISTS (SELECT 1 FROM public.event_prices LIMIT 1) THEN
            RAISE NOTICE '⚠️ 警告: event_prices 表中有数据，请先确认是否需要迁移到 prices 表';
            RAISE NOTICE '如果不需要迁移，可以手动执行: DROP TABLE public.event_prices CASCADE;';
        ELSE
            DROP TABLE public.event_prices CASCADE;
            RAISE NOTICE '✅ event_prices 表已删除（表为空）';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ event_prices 表不存在，跳过';
    END IF;
END $$;

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 清理完成！';
    RAISE NOTICE '📊 检查剩余表：';
END $$;

-- 显示所有剩余的表
SELECT 
    table_name,
    CASE 
        WHEN table_type = 'VIEW' THEN '视图'
        ELSE '表'
    END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

