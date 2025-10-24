-- 测试数据库结构
-- 运行此脚本来验证表是否正确创建

-- 检查所有表是否存在
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'merchants', 'admin_invite_codes', 'events', 'prices', 'orders', 'tickets')
ORDER BY table_name;

-- 检查用户表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查商家表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'merchants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查邀请码表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'admin_invite_codes' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查活动表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查外键约束
SELECT 
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
    AND tc.table_name IN ('users', 'merchants', 'admin_invite_codes', 'events', 'prices', 'orders', 'tickets')
ORDER BY tc.table_name, kcu.column_name;

-- 检查索引
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('users', 'merchants', 'admin_invite_codes', 'events', 'prices', 'orders', 'tickets')
ORDER BY tablename, indexname;
