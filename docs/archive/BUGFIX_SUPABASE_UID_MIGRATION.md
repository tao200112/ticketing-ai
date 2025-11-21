# Bug 修复：新账号买票后 My Tickets / Order History 为空

## 问题描述

新账号买票后，虽然付款成功、Supabase 表里有订单和票记录，但 Account 页面的 My Tickets 和 Order History 不显示任何数据。老账号显示正常。

## 根本原因

1. **用户标识字段不统一**：
   - 老账号使用 `users` 表的 `id` 字段（`user_id`）
   - 新账号只有 Supabase Auth UID，没有 `users` 表的记录
   - 查询逻辑依赖 `user_id` 字段，导致新账号查询不到记录

2. **RLS Policy 不匹配**：
   - RLS policies 使用 `user_id` 或 `customer_email` 匹配
   - 没有使用 Supabase Auth UID (`auth.uid()`)

## 修复方案

统一使用 **Supabase Auth UID** (`supabase_uid`) 作为用户标识字段，同时保留 `user_id` 字段以兼容旧数据。

## 变更文件列表

### 1. 数据库迁移

#### `supabase/migrations/add_supabase_uid_to_orders_tickets.sql`
- 为 `orders` 和 `tickets` 表添加 `supabase_uid` 字段
- 创建索引以提高查询性能
- 通过邮箱匹配更新现有记录的 `supabase_uid`

#### `supabase/migrations/update_rls_policies_for_supabase_uid.sql`
- 更新 RLS policies，优先使用 `supabase_uid = auth.uid()` 匹配
- 保留邮箱匹配作为回退方案（兼容旧数据）

### 2. Webhook 和订单创建

#### `app/api/webhook/route.js`
- **修改前**：只写入 `user_id`（可能是 users 表的 id）
- **修改后**：
  - 通过邮箱从 `auth.users` 查找 Supabase UID
  - 创建订单和票务时同时写入 `supabase_uid` 和 `user_id`
  - 在 metadata 中存储 `supabase_uid`

#### `app/api/orders/by-session/route.js`
- **修改前**：使用 `user_id` 创建订单和票务
- **修改后**：
  - 使用 `supabase_uid` 创建订单和票务（`userId` 在这里应该是 Supabase Auth UID）
  - 查询时优先使用 `supabase_uid` 匹配，回退到 `user_id` 和邮箱

#### `app/api/checkout_sessions/route.js`
- **修改前**：只传递 `user_id` 到 Stripe metadata
- **修改后**：
  - 从当前 session 获取 Supabase Auth UID
  - 在 Stripe metadata 中同时存储 `user_id` 和 `supabase_uid`

### 3. 前端查询逻辑

#### `app/account/page.js`
- **修改前**：使用 `userData.id`（users 表的 id）和邮箱查询
- **修改后**：
  - 获取当前登录用户的 Supabase Auth UID
  - 查询 tickets 时优先使用 `supabase_uid`，回退到 `user_id` 和邮箱
  - 查询 orders 时优先使用 `supabase_uid`，回退到邮箱
  - 添加详细的调试日志

### 4. 工具函数

#### `lib/ticket-service.js`
- **修改前**：使用 `user_id` 查询
- **修改后**：使用 `supabase_uid` 或 `user_id` 查询（兼容旧数据）

## 部署步骤

### 步骤 1：运行数据库迁移

在 Supabase SQL Editor 中依次执行：

1. `supabase/migrations/add_supabase_uid_to_orders_tickets.sql`
   - 添加 `supabase_uid` 字段
   - 更新现有记录

2. `supabase/migrations/update_rls_policies_for_supabase_uid.sql`
   - 更新 RLS policies

### 步骤 2：部署代码

部署修改后的代码到生产环境。

### 步骤 3：验证修复

1. **新账号测试**：
   - 使用新账号登录
   - 购买一张票
   - 检查 Account 页面的 My Tickets 和 Order History
   - 查看浏览器控制台的调试日志

2. **老账号测试**：
   - 使用老账号登录
   - 确认 My Tickets 和 Order History 仍然正常显示

3. **调试日志检查**：
   - 打开浏览器控制台
   - 查看 Account 页面加载时的日志：
     - `🔍 Account Page - Current Supabase UID: ...`
     - `🎫 Account Page - Tickets found: X tickets`
     - `📦 Account Page - Orders found: X orders`
     - `👤 Account Page - Current User Info: ...`

## 兼容性说明

- **向后兼容**：保留 `user_id` 字段，旧数据仍然可以正常查询
- **渐进式迁移**：新数据使用 `supabase_uid`，旧数据通过邮箱匹配自动更新
- **查询策略**：优先使用 `supabase_uid`，如果没有则回退到 `user_id` 或邮箱匹配

## 调试信息

Account 页面现在会输出以下调试信息：

```javascript
// 当前用户信息
👤 Account Page - Current User Info: {
  id: "...",           // users 表的 id
  email: "...",        // 用户邮箱
  supabase_uid: "...", // Supabase Auth UID
  has_tickets: true,   // 是否有票
  has_orders: true     // 是否有订单
}

// 票务信息
🎫 Account Page - Tickets found: 2 tickets
🎫 Account Page - First 2 tickets: [
  {
    id: "...",
    supabase_uid: "...",
    user_id: "...",
    holder_email: "..."
  }
]

// 订单信息
📦 Account Page - Orders found: 1 orders
📦 Account Page - First 2 orders: [
  {
    id: "...",
    supabase_uid: "...",
    user_id: "...",
    customer_email: "..."
  }
]
```

## 注意事项

1. **Webhook 中的邮箱匹配**：如果 Stripe metadata 中没有 `supabase_uid`，webhook 会通过 `customer_email` 从 `auth.users` 查找。这需要 Service Role Key 权限。

2. **RLS Policy 回退**：如果 `supabase_uid` 为空（旧数据），RLS policy 会回退到邮箱匹配。

3. **索引性能**：已为 `supabase_uid` 字段创建索引，查询性能不会受影响。

## 相关文件

- `supabase/migrations/add_supabase_uid_to_orders_tickets.sql`
- `supabase/migrations/update_rls_policies_for_supabase_uid.sql`
- `app/api/webhook/route.js`
- `app/api/orders/by-session/route.js`
- `app/api/checkout_sessions/route.js`
- `app/account/page.js`
- `lib/ticket-service.js`

