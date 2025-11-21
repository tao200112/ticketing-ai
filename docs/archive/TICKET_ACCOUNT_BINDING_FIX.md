# 票据账号绑定修复指南

## 问题描述
- 购买的票据没有绑定到用户账号
- 用户账号中看不到历史票务信息
- 需要限制只有登录用户才能购买票据

## 修复内容

### 1. 数据库架构更新
- 添加了 `user_id` 字段到 `tickets` 和 `orders` 表
- 创建了相应的索引以提高查询性能
- 通过邮箱匹配现有票据和用户

### 2. 票据服务更新
- 修改了 `processPaidOrder` 函数，添加用户ID绑定
- 添加了 `getUserTickets` 和 `getUserTicketsByEmail` 函数
- 票据创建时会自动绑定到用户账号

### 3. API端点更新
- 创建了 `/api/user/tickets` 端点获取用户票据历史
- 修改了结账会话API，添加登录验证
- 只有登录用户才能创建结账会话

### 4. 前端页面更新
- 修改了动态活动页面，添加登录验证
- 更新了账号页面，从API获取票据历史
- 购买票据前会检查用户登录状态

## 部署步骤

### 步骤1：更新数据库架构
```sql
-- 在Supabase SQL编辑器中执行
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
```

### 步骤2：验证修复
1. 登录用户账号
2. 购买一张票据
3. 检查账号页面是否显示票据历史
4. 验证只有登录用户才能购买票据

## 功能特性

### 用户票据绑定
- 票据创建时自动绑定到用户账号
- 支持通过用户ID或邮箱查找票据
- 票据历史按创建时间倒序排列

### 登录验证
- 购买票据前检查用户登录状态
- 未登录用户会收到提示信息
- 支持降级到本地存储模式

### 票据历史显示
- 账号页面显示完整的票据历史
- 包含活动信息、价格、状态等详细信息
- 支持二维码生成和显示

## 测试建议

1. **登录验证测试**
   - 未登录用户尝试购买票据
   - 登录用户正常购买票据

2. **票据绑定测试**
   - 购买票据后检查数据库中的user_id字段
   - 验证账号页面显示票据历史

3. **历史票据测试**
   - 检查现有票据是否正确绑定到用户
   - 验证票据历史查询功能

## 注意事项

- 现有票据会通过邮箱自动匹配到用户
- 如果邮箱不匹配，票据可能无法显示在用户历史中
- 建议在生产环境部署前进行充分测试
