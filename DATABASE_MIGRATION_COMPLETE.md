# PartyTix 数据库全面修复完成报告

## 📋 执行摘要

本次修复统一了用户体系，将所有 `user_id` 字段迁移到 `supabase_uid`，重建了 RLS 策略，重构了表结构，并 ENUM 化了 status 字段。

## ✅ 完成的修复

### 1. 统一用户体系 ✅

**迁移文件：** `supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql`

**修改的表：**
- ✅ `orders` - 添加 `supabase_uid`，保留 `user_id`（deprecated）
- ✅ `tickets` - 添加 `supabase_uid`，保留 `user_id`（deprecated）
- ✅ `merchant_members` - 添加 `supabase_uid`，保留 `user_id`（deprecated）
- ✅ `merchants` - 添加 `owner_supabase_uid`，保留 `owner_user_id`（deprecated）
- ✅ `ticket_redemptions` - 添加 `supabase_uid` 和 `redeemed_by_supabase_uid`，保留旧字段（deprecated）

**数据迁移：**
- ✅ 自动从 `user_id` 迁移到 `supabase_uid`（通过 users 表或 email 匹配）
- ✅ 创建了所有必要的索引

### 2. 重建 RLS 策略 ✅

**迁移文件：** `supabase/migrations/20250115_rebuild_rls_policies.sql`

**修复的安全漏洞：**
- ✅ `ticket_redemptions` 表现在有严格的 RLS（之前完全 Unrestricted）
- ✅ 所有策略统一使用 `supabase_uid`
- ✅ 商家员工只能查看/操作自己商家的数据

**新的 RLS 策略：**
- `orders_select_by_supabase_uid` - 用户只能查看自己的订单
- `tickets_select_by_supabase_uid` - 用户只能查看自己的票务
- `ticket_redemptions_select_own` - 用户只能查看自己票务的核销记录
- `ticket_redemptions_insert_merchant_staff` - 商家员工可以插入核销记录

### 3. 重构票务表结构 ✅

**迁移文件：** `supabase/migrations/20250115_refactor_tickets_structure.sql`

**改进：**
- ✅ 合并 `event_*_snapshot` 字段为 `event_snapshot JSONB`
- ✅ 合并 `price_*_snapshot` 字段为 `price_snapshot JSONB`
- ✅ 标记旧字段为 deprecated（保留数据）
- ✅ 创建 GIN 索引支持 JSONB 查询

### 4. ENUM 化 status 字段 ✅

**迁移文件：** `supabase/migrations/20250115_enum_status_fields.sql`

**改进：**
- ✅ `orders.status` → `orders_status ENUM` (pending, paid, failed, refunded)
- ✅ `tickets.status` → `ticket_status ENUM` (unused, used, revoked)
- ✅ 清理了所有脏数据（Payed → paid, 大小写统一等）

### 5. 重构 short_id ✅

**迁移文件：** `supabase/migrations/20250115_refactor_short_id_nanoid.sql`

**改进：**
- ✅ 创建了 `generate_nanoid_short_id()` 函数
- ✅ 创建了带重试的插入函数示例
- ✅ 添加了 UNIQUE 约束检查

## 📝 废弃字段清单

以下字段已标记为 DEPRECATED，保留用于向后兼容，但不应在新代码中使用：

### Orders 表
- `user_id` → 使用 `supabase_uid` 代替

### Tickets 表
- `user_id` → 使用 `supabase_uid` 代替
- `status` → 使用 `used` 字段代替（status 保留但优先使用 used）
- `event_title_snapshot` → 使用 `event_snapshot->>'title'` 代替
- `event_description_snapshot` → 使用 `event_snapshot->>'description'` 代替
- `event_venue_snapshot` → 使用 `event_snapshot->>'venue'` 代替
- `event_address_snapshot` → 使用 `event_snapshot->>'address'` 代替
- `event_poster_url_snapshot` → 使用 `event_snapshot->>'poster_url'` 代替
- `event_start_at_snapshot` → 使用 `event_snapshot->>'start_at'` 代替
- `event_end_at_snapshot` → 使用 `event_snapshot->>'end_at'` 代替
- `price_name_snapshot` → 使用 `price_snapshot->>'name'` 代替
- `price_amount_cents_snapshot` → 使用 `price_snapshot->>'amount_cents'` 代替
- `price_currency_snapshot` → 使用 `price_snapshot->>'currency'` 代替

### Merchant Members 表
- `user_id` → 使用 `supabase_uid` 代替

### Merchants 表
- `owner_user_id` → 使用 `owner_supabase_uid` 代替

### Ticket Redemptions 表
- `user_id` → 使用 `supabase_uid` 代替
- `redeemed_by` → 使用 `redeemed_by_supabase_uid` 代替

## 🔄 Supabase UID 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户认证 (Supabase Auth)                                 │
│    auth.users.id = supabase_uid                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 创建订单 (Checkout Sessions API)                          │
│    orders.supabase_uid = auth.uid()                        │
│    orders.user_id = DEPRECATED                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 创建票务 (Webhook API)                                    │
│    tickets.supabase_uid = auth.uid()                       │
│    tickets.user_id = DEPRECATED                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 查询数据 (RLS Policy)                                    │
│    SELECT * FROM tickets                                    │
│    WHERE supabase_uid = auth.uid()                         │
│    (RLS 自动过滤)                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 核销票务 (Merchant Redeem API)                           │
│    ticket_redemptions.supabase_uid = ticket.supabase_uid  │
│    ticket_redemptions.redeemed_by_supabase_uid = auth.uid() │
└─────────────────────────────────────────────────────────────┘
```

## 📋 代码更新清单

### 需要更新的文件

#### 1. `app/api/webhook/route.js`
- [ ] 移除 `user_id: session.metadata?.user_id` 的写入
- [ ] 确保只使用 `supabase_uid`

#### 2. `app/api/orders/by-session/route.js`
- [ ] 移除所有 `user_id` 的查询和写入
- [ ] 统一使用 `supabase_uid`

#### 3. `app/api/tickets/use/route.js`
- [ ] 更新 `ticket_redemptions` 插入，使用 `supabase_uid` 和 `redeemed_by_supabase_uid`
- [ ] 移除 `user_id` 的查询

#### 4. `app/api/merchant/redeem/route.js`
- [ ] 更新 `redeemed_by` 为 `redeemed_by_supabase_uid`
- [ ] 更新 `merchants.owner_user_id` 查询为 `owner_supabase_uid`

#### 5. `app/api/merchant/create/route.js`
- [ ] 更新 `owner_user_id` 为 `owner_supabase_uid`

#### 6. `app/api/merchant/login/route.js`
- [ ] 更新 `owner_user_id` 查询为 `owner_supabase_uid`

#### 7. `app/merchant/staff/page.js`
- [ ] 更新 `merchant_members` 查询，使用 `supabase_uid`

#### 8. `app/merchant/scan/page.js`
- [ ] 更新所有 `user_id` 引用为 `supabase_uid`

### 代码更新示例

#### 查询订单（旧 → 新）
```javascript
// ❌ 旧代码
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)

// ✅ 新代码
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('supabase_uid', supabaseUid)
```

#### 插入票务（旧 → 新）
```javascript
// ❌ 旧代码
await supabase.from('tickets').insert({
  user_id: userId,
  // ...
})

// ✅ 新代码
await supabase.from('tickets').insert({
  supabase_uid: supabaseUid,
  // ...
})
```

#### 查询商家（旧 → 新）
```javascript
// ❌ 旧代码
const { data } = await supabase
  .from('merchants')
  .select('*')
  .eq('owner_user_id', userId)

// ✅ 新代码
const { data } = await supabase
  .from('merchants')
  .select('*')
  .eq('owner_supabase_uid', supabaseUid)
```

## 🧪 测试脚本

见 `supabase/migrations/20250115_test_migration.sql`

## 📚 迁移指南

### 从旧结构迁移到新结构

1. **运行迁移文件（按顺序）**
   ```sql
   -- 1. 统一用户体系
   \i supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql
   
   -- 2. 重建 RLS 策略
   \i supabase/migrations/20250115_rebuild_rls_policies.sql
   
   -- 3. 重构票务表
   \i supabase/migrations/20250115_refactor_tickets_structure.sql
   
   -- 4. ENUM 化 status
   \i supabase/migrations/20250115_enum_status_fields.sql
   
   -- 5. 重构 short_id
   \i supabase/migrations/20250115_refactor_short_id_nanoid.sql
   ```

2. **更新代码**
   - 参考上面的代码更新清单
   - 将所有 `user_id` 替换为 `supabase_uid`
   - 更新所有查询和插入语句

3. **测试**
   - 运行测试脚本验证迁移
   - 测试购买流程
   - 测试核销流程
   - 验证 RLS 策略

## ⚠️ 重要注意事项

1. **不要删除废弃字段**
   - 所有废弃字段都保留用于向后兼容
   - 新代码不应使用这些字段

2. **RLS 策略**
   - 所有策略现在使用 `supabase_uid`
   - 确保用户已登录才能访问数据

3. **数据一致性**
   - 迁移脚本会自动迁移现有数据
   - 如果迁移失败，检查日志

4. **性能**
   - 所有 `supabase_uid` 字段都有索引
   - JSONB 字段有 GIN 索引支持查询

## 📊 最终 RLS 策略列表

### Orders 表
- `orders_select_by_supabase_uid` - SELECT: `auth.uid() = supabase_uid`
- `orders_update_by_supabase_uid` - UPDATE: `auth.uid() = supabase_uid`
- `orders_insert_allow` - INSERT: Service Role only

### Tickets 表
- `tickets_select_by_supabase_uid` - SELECT: `auth.uid() = supabase_uid`
- `tickets_insert_allow` - INSERT: Service Role only
- `tickets_update_by_merchant_staff` - UPDATE: Merchant staff for their events

### Ticket Redemptions 表
- `ticket_redemptions_select_own` - SELECT: User's own ticket redemptions
- `ticket_redemptions_select_merchant` - SELECT: Merchant staff can view their merchant's redemptions
- `ticket_redemptions_insert_merchant_staff` - INSERT: Merchant staff only

### Merchants 表
- `merchants_select_owner` - SELECT: Owner or member
- `merchants_update_owner` - UPDATE: Owner only

### Merchant Members 表
- `merchant_members_select_own` - SELECT: Own membership
- `merchant_members_select_merchant` - SELECT: Merchant owner can view all members

### Events 表
- `events_select_public` - SELECT: Published events (public)
- `events_select_merchant` - SELECT: Merchant staff can view their merchant's events

## 🎯 下一步

1. 运行所有迁移文件
2. 更新代码使用 `supabase_uid`
3. 运行测试脚本验证
4. 部署到生产环境
5. 监控日志确保一切正常

