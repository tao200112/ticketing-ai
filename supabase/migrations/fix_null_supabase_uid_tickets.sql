-- 修复 supabase_uid 为 null 的票务
-- 通过邮箱匹配更新旧票的 supabase_uid

-- ========================================
-- 1. 查看需要修复的票务数量
-- ========================================

SELECT 
  'Tickets with null supabase_uid' as check_type,
  COUNT(*) as count
FROM tickets
WHERE supabase_uid IS NULL;

-- ========================================
-- 2. 通过邮箱匹配更新 supabase_uid
-- ========================================

UPDATE tickets t
SET supabase_uid = au.id
FROM auth.users au
WHERE t.holder_email = au.email
  AND t.supabase_uid IS NULL
  AND au.id IS NOT NULL;

-- ========================================
-- 3. 验证修复结果
-- ========================================

SELECT 
  'After fix - Tickets with null supabase_uid' as check_type,
  COUNT(*) as count
FROM tickets
WHERE supabase_uid IS NULL;

-- ========================================
-- 4. 查看修复后的票务示例
-- ========================================

SELECT 
  id,
  short_id,
  holder_email,
  supabase_uid,
  created_at
FROM tickets
WHERE supabase_uid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 说明：
-- 1. 此脚本会通过 holder_email 匹配 auth.users 来更新 supabase_uid
-- 2. 只更新 supabase_uid 为 null 的票务
-- 3. 如果邮箱不匹配，票务的 supabase_uid 将保持为 null
-- ========================================

