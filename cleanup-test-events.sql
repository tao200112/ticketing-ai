-- 清理 Supabase 中的测试活动
-- 请将此 SQL 复制到 Supabase Dashboard 的 SQL Editor 中运行

-- 1. 删除标题为 "11", "bb", "aa" 的测试活动
DELETE FROM events 
WHERE title IN ('11', 'bb', 'aa') 
   OR title IS NULL 
   OR trim(title) = '';

-- 2. 查看剩余的活动
SELECT id, title, status, created_at 
FROM events 
ORDER BY created_at DESC;





