-- 添加用户ID字段到票据表
-- 修复票据与用户账号绑定问题

-- 添加用户ID字段到票据表
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 添加用户ID字段到订单表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 更新现有票据，尝试通过邮箱匹配用户
UPDATE tickets 
SET user_id = (
    SELECT u.id 
    FROM users u 
    WHERE u.email = tickets.holder_email 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 更新现有订单，尝试通过邮箱匹配用户
UPDATE orders 
SET user_id = (
    SELECT u.id 
    FROM users u 
    WHERE u.email = orders.customer_email 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE 'Successfully added user_id fields to tickets and orders tables!';
    RAISE NOTICE 'Existing tickets and orders have been linked to users by email.';
END $$;
