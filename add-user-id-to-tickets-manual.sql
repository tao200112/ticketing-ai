-- 在Supabase SQL编辑器中执行以下SQL来添加用户ID字段到票据表

-- 1. 添加用户ID字段
ALTER TABLE tickets ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. 创建用户ID索引
CREATE INDEX idx_tickets_user_id ON tickets(user_id);

-- 3. 更新现有票据的用户ID（基于邮箱匹配）
UPDATE tickets 
SET user_id = users.id 
FROM users 
WHERE tickets.holder_email = users.email;

-- 4. 添加注释
COMMENT ON COLUMN tickets.user_id IS '票据持有者的用户ID，优先于holder_email使用';
COMMENT ON COLUMN tickets.holder_email IS '票据持有者的邮箱，用于兼容性和备用查询';

-- 5. 验证更新结果
SELECT 
  t.id, 
  t.holder_email, 
  t.user_id, 
  u.email as user_email,
  u.name as user_name
FROM tickets t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;
