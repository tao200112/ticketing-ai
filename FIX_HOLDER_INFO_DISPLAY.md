# 修复扫票页面持票人姓名和年龄显示问题

## 问题描述

扫票页面（Merchant Scan Page）无法显示购票时填写的姓名和年龄信息，导致员工无法核验ID和票务。

## 根本原因

1. **数据库表缺少字段**：`tickets` 表缺少 `holder_name` 和 `holder_age` 字段
2. **Orders 表缺少字段**：`orders` 表缺少 `customer_age` 字段
3. **Webhook 未保存年龄**：webhook 在创建订单时没有保存 `customer_age`
4. **验证 API 查询不完整**：验证 API 查询 orders 时没有包含 `customer_age` 字段

## 解决方案

### 1. 数据库迁移（必须执行）

**文件**: `supabase/migrations/add_holder_info_fields.sql`

在 Supabase SQL Editor 中执行此迁移文件，添加以下字段：

- `tickets.holder_name` - 持票人姓名
- `tickets.holder_age` - 持票人年龄
- `orders.customer_age` - 客户年龄

**执行步骤**：
1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `supabase/migrations/add_holder_info_fields.sql` 的内容
4. 执行 SQL 脚本
5. 验证迁移成功（脚本会输出验证结果）

### 2. 代码更改

#### 2.1 Webhook 更新 (`app/api/webhook/route.js`)
- ✅ 在创建订单时保存 `customer_age` 到 orders 表
- ✅ 从 Stripe metadata 或用户数据获取年龄信息
- ✅ 在创建票据时保存 `holder_name` 和 `holder_age`（已存在）

#### 2.2 验证 API 更新 (`app/api/tickets/verify/route.js`)
- ✅ 查询 orders 表时包含 `customer_age` 字段
- ✅ 如果 tickets 表中没有 `holder_age`，从 orders 表的 `customer_age` 获取
- ✅ 确保正确返回 `holder_name` 和 `holder_age`

#### 2.3 前端显示（已存在）
- ✅ `app/merchant/scan/page.js` 已正确显示 holder_name 和 holder_age
- ✅ 显示 "N/A" 如果数据缺失

## 数据流

### 购票流程
1. 用户在购票页面填写：姓名、邮箱、年龄
2. 创建 Stripe Checkout Session，metadata 包含 `customer_name` 和 `customer_age`
3. 支付成功后，Stripe webhook 触发
4. Webhook 创建订单，保存到 `orders` 表：
   - `customer_name`
   - `customer_email`
   - `customer_age`（新增）
5. Webhook 创建票据，保存到 `tickets` 表：
   - `holder_name`（从 customer_name 获取）
   - `holder_age`（从 customer_age 获取）

### 验证流程
1. 商家扫描二维码
2. 验证 API 查询票据信息
3. 如果 tickets 表有 `holder_name` 和 `holder_age`，直接使用
4. 如果缺失，从关联的 orders 表获取 `customer_name` 和 `customer_age`
5. 返回完整信息给前端显示

## 测试步骤

### 1. 执行数据库迁移
```sql
-- 在 Supabase SQL Editor 中执行
-- 运行 supabase/migrations/add_holder_info_fields.sql
```

### 2. 测试新购票
1. 购买一张新票，填写姓名和年龄
2. 完成支付
3. 在 Supabase Dashboard 中检查：
   - `orders` 表是否有 `customer_age`
   - `tickets` 表是否有 `holder_name` 和 `holder_age`

### 3. 测试扫描显示
1. 在商家扫描页面扫描二维码
2. 验证显示：
   - ✅ Holder Name: 应该显示购票时填写的姓名
   - ✅ Age: 应该显示购票时填写的年龄
   - ❌ 不应该显示 "Unknown" 或 "N/A"（对于新购的票）

### 4. 测试历史票据（可选）
- 迁移脚本会自动从 orders 表更新历史票据的 holder_name
- 但如果 orders 表也没有 customer_age，历史票据可能仍然显示 "N/A"

## 更新现有票据

迁移脚本会自动更新现有票据的 holder_name 和 holder_age（如果 orders 表中有对应数据）。

如果需要手动更新：

```sql
-- 更新 holder_name
UPDATE tickets t
SET holder_name = o.customer_name
FROM orders o
WHERE t.order_id = o.id
  AND (t.holder_name IS NULL OR t.holder_name = '')
  AND o.customer_name IS NOT NULL;

-- 更新 holder_age
UPDATE tickets t
SET holder_age = o.customer_age
FROM orders o
WHERE t.order_id = o.id
  AND t.holder_age IS NULL
  AND o.customer_age IS NOT NULL;
```

## 注意事项

1. **新购票**：执行迁移和代码更新后，新购的票应该能正确显示姓名和年龄
2. **历史票据**：如果历史订单在 orders 表中没有 `customer_age`，这些票据可能仍然显示 "N/A"
3. **数据一致性**：确保购票时用户填写了姓名和年龄，否则字段可能为空

## 验证清单

- [ ] 执行数据库迁移脚本
- [ ] 验证 tickets 表有 holder_name 和 holder_age 字段
- [ ] 验证 orders 表有 customer_age 字段
- [ ] 测试购买新票，填写姓名和年龄
- [ ] 验证新票据在扫描页面显示正确的姓名和年龄
- [ ] 验证错误处理（缺失数据时显示 "N/A"）
