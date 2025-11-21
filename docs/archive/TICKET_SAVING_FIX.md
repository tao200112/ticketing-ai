# 票据保存问题修复指南

## 问题描述
用户买票后，账号页面显示"No Tickets Found"，票据没有正确保存到数据库。

## 修复内容

### 1. 票据服务更新
- 修改了 `lib/ticket-service.js`，添加了Supabase支持
- 票据创建现在支持Supabase和Prisma两种数据库
- 添加了用户ID绑定功能

### 2. Webhook处理更新
- 修复了 `app/api/stripe/webhook/route.js` 中的导入路径
- 确保支付完成后正确调用票据创建服务

### 3. 数据库架构
- 需要确保Supabase数据库包含正确的表结构
- 票据表需要包含 `user_id` 字段

## 部署步骤

### 步骤1：应用数据库架构更新
在Supabase SQL编辑器中执行以下SQL：

```sql
-- 添加用户ID字段到票据表
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 添加用户ID字段到订单表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
```

### 步骤2：验证修复
1. 用户登录账号
2. 购买一张票据
3. 检查账号页面是否显示票据历史
4. 验证票据信息是否正确保存

## 测试流程

### 1. 登录测试
- 访问登录页面
- 使用现有账号登录
- 验证登录成功

### 2. 买票测试
- 访问活动页面
- 选择票务类型
- 完成支付流程
- 验证支付成功

### 3. 票据历史测试
- 访问账号页面
- 检查"My Tickets"部分
- 验证票据信息显示

## 故障排除

### 如果票据仍然不显示：

1. **检查数据库连接**
   - 确认Supabase环境变量设置正确
   - 验证数据库表结构是否正确

2. **检查Webhook处理**
   - 确认Stripe webhook正确配置
   - 验证支付完成后是否调用了票据创建服务

3. **检查用户ID绑定**
   - 确认购买票据时传递了正确的用户ID
   - 验证票据创建时是否正确绑定了用户

## 预期结果

修复后，用户应该能够：
- 正常购买票据
- 在账号页面看到票据历史
- 查看票据详细信息
- 使用二维码功能

## 注意事项

- 现有票据可能需要手动关联到用户
- 建议在修复后重新测试完整的购买流程
- 确保所有环境变量配置正确
