-- 添加用户ID字段到票据表
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 创建用户ID索引
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- 更新现有票据的用户ID（基于邮箱匹配）
UPDATE tickets 
SET user_id = users.id 
FROM users 
WHERE tickets.holder_email = users.email;

-- 添加注释
COMMENT ON COLUMN tickets.user_id IS '票据持有者的用户ID，优先于holder_email使用';
COMMENT ON COLUMN tickets.holder_email IS '票据持有者的邮箱，用于兼容性和备用查询';

