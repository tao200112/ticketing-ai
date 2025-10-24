-- 验证数据库是否正确创建
-- 在 Supabase SQL Editor 中运行此脚本

-- 检查所有表是否存在
SELECT 
    'Tables created successfully!' as status,
    table_name,
    'Table exists' as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'merchants', 'admin_invite_codes', 'events', 'prices', 'orders', 'tickets')
ORDER BY table_name;

-- 检查活动表结构（特别是merchant_id列）
SELECT 
    'Events table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查外键关系
SELECT 
    'Foreign key relationships:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('events', 'merchants', 'admin_invite_codes')
ORDER BY tc.table_name, kcu.column_name;

-- 检查种子数据
SELECT 
    'Seed data:' as info,
    name,
    verified,
    status
FROM merchants 
WHERE name = 'Ridiculous Chicken';
