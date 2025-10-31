-- Fix Existing Merchants for Login
-- 修复现有商家用户的登录问题
-- 
-- 问题：某些商家用户可能在merchants表中没有记录，或者在merchant_members表中没有记录
-- 解决方案：为所有merchant角色的用户确保有商家关联

-- ========================================
-- Step 1: 查找没有商家关联的merchant用户
-- ========================================

-- 查找所有merchant角色但既不是owner也不是员工的用户
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM merchants m WHERE m.owner_user_id = u.id) THEN 'owner'
    WHEN EXISTS (SELECT 1 FROM merchant_members mm WHERE mm.user_id = u.id) THEN 'staff'
    ELSE 'no_merchant'
  END AS merchant_status
FROM users u
WHERE u.role = 'merchant'
AND NOT EXISTS (
  SELECT 1 FROM merchants m WHERE m.owner_user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM merchant_members mm WHERE mm.user_id = u.id
);

-- ========================================
-- Step 2: 为没有商家关联的用户创建商家记录
-- ========================================

-- 为没有merchant关联的merchant用户创建默认商家
-- 注意：只在merchants表中没有记录时才创建
DO $$
DECLARE
  user_record RECORD;
  new_merchant_id UUID;
BEGIN
  FOR user_record IN 
    SELECT id, email, name
    FROM users
    WHERE role = 'merchant'
    AND NOT EXISTS (
      SELECT 1 FROM merchants WHERE owner_user_id = users.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM merchant_members WHERE user_id = users.id
    )
  LOOP
    -- 创建商家记录
    INSERT INTO merchants (
      owner_user_id,
      name,
      description,
      contact_email,
      verified,
      status
    ) VALUES (
      user_record.id,
      COALESCE(user_record.name, '未命名商家'),
      '自动创建的商家账户',
      user_record.email,
      false,
      'active'
    )
    RETURNING id INTO new_merchant_id;
    
    RAISE NOTICE '为用户 % (email: %) 创建了商家记录 (ID: %)', 
      user_record.id, 
      user_record.email, 
      new_merchant_id;
  END LOOP;
END $$;

-- ========================================
-- Step 3: 验证修复结果
-- ========================================

-- 检查是否还有没有商家关联的merchant用户
SELECT 
  COUNT(*) as users_without_merchant
FROM users u
WHERE u.role = 'merchant'
AND NOT EXISTS (
  SELECT 1 FROM merchants m WHERE m.owner_user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM merchant_members mm WHERE mm.user_id = u.id
);

-- 应该返回 0

-- ========================================
-- Step 4: 验证merchants表的数据
-- ========================================

-- 查看所有merchant用户及其商家关联
SELECT 
  u.id as user_id,
  u.email,
  u.name as user_name,
  CASE 
    WHEN m.id IS NOT NULL THEN 'owner'
    WHEN mm.merchant_id IS NOT NULL THEN 'staff'
    ELSE 'no_merchant'
  END AS association_type,
  COALESCE(m.id, mm.merchant_id) as merchant_id,
  COALESCE(m.name, 'N/A') as merchant_name
FROM users u
LEFT JOIN merchants m ON m.owner_user_id = u.id
LEFT JOIN merchant_members mm ON mm.user_id = u.id
WHERE u.role = 'merchant'
ORDER BY u.email;

-- ========================================
-- 完成
-- ========================================

SELECT 'Merchant association fix completed!' as status;

