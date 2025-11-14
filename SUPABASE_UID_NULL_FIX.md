# Supabase UID 为 Null 问题修复

## 🐛 问题描述

最新创建的票务中 `supabase_uid` 为 null，导致：
- 新订单成功页显示 "0 tickets created"
- My Tickets 不显示新票
- 新票无法生成 QR code

## 🔍 根本原因分析

可能的原因：
1. **用户未登录**：创建 checkout session 时用户未登录，导致 `getServerUser()` 返回 null
2. **Metadata 传递失败**：Stripe metadata 中的 `supabase_uid` 没有正确传递到 webhook
3. **代码未部署**：修复代码还没有部署到生产环境

## ✅ 修复措施

### 1. 强制登录检查

**文件：** `app/api/checkout_sessions/route.js`

**修改：**
- ✅ 添加强制登录检查：如果用户未登录，拒绝创建 checkout session
- ✅ 确保 `supabase_uid` 不为 null 才写入 metadata
- ✅ 添加详细的调试日志

```javascript
// 如果用户未登录，拒绝创建 checkout session
if (!supabaseUid) {
  console.error('[CheckoutSessions] CRITICAL: User not authenticated!')
  throw ErrorHandler.unauthorizedError(
    'AUTHENTICATION_REQUIRED',
    'User must be logged in to create checkout session'
  )
}
```

### 2. Webhook 验证和错误处理

**文件：** `app/api/webhook/route.js`

**修改：**
- ✅ 如果 `supabase_uid` 为 null，拒绝创建订单和票务
- ✅ 添加详细的错误日志
- ✅ 验证创建的订单和票务确实有 `supabase_uid`

```javascript
// 验证 supabase_uid 不为 null 再创建订单
if (!supabaseUid) {
  console.error('❌ [Webhook] CRITICAL: Cannot create order without supabase_uid!')
  return NextResponse.json({ 
    error: 'Missing supabase_uid in checkout session metadata',
    details: 'The checkout session does not contain supabase_uid. Please ensure user is logged in when creating checkout session.'
  }, { status: 500 })
}
```

### 3. 修复旧票的 SQL 脚本

**文件：** `supabase/migrations/fix_null_supabase_uid_tickets.sql`

**功能：**
- 通过邮箱匹配更新旧票的 `supabase_uid`
- 只更新 `supabase_uid` 为 null 的票务

## 🔧 诊断步骤

### 步骤 1: 检查 Vercel Logs

在 Vercel Dashboard 中查看 Logs，查找：

**Checkout Sessions:**
```
[CheckoutSessions] supabase_uid = <uuid> 或 null
[CheckoutSessions] CRITICAL: User not authenticated!  ← 如果看到这个，说明用户未登录
```

**Webhook:**
```
[Webhook] supabase_uid = <uuid> 或 null
[Webhook] ⚠️ Missing supabase_uid in metadata!  ← 如果看到这个，说明 metadata 中没有 supabase_uid
[Webhook] CRITICAL: Cannot create order without supabase_uid!  ← 如果看到这个，说明 webhook 拒绝了创建
```

### 步骤 2: 检查 Stripe Dashboard

1. 打开 Stripe Dashboard
2. 找到最新的 checkout session
3. 查看 metadata，确认是否包含 `supabase_uid`

### 步骤 3: 执行诊断 SQL

在 Supabase SQL Editor 中执行：
```sql
\i supabase/migrations/diagnose_supabase_uid_issue.sql
```

查看输出，确认：
- 最新票务的 `supabase_uid` 是否为 null
- 对应订单的 `supabase_uid` 是否为 null
- 是否有匹配的 auth.users 记录

### 步骤 4: 修复旧票（可选）

如果诊断显示可以修复，执行：
```sql
\i supabase/migrations/fix_null_supabase_uid_tickets.sql
```

## 🧪 测试步骤

### 测试 1: 确保用户已登录

1. **打开浏览器控制台**
2. **访问活动页面**，点击购买
3. **检查网络请求**：
   - 找到 `/api/checkout_sessions` 请求
   - 查看响应，如果返回 401，说明用户未登录

### 测试 2: 使用新账号购买

1. **确保用户已登录**（检查 Account 页面能正常显示）
2. **选择一个活动**，点击购买
3. **完成支付**
4. **查看 Vercel Logs**，应该看到：
   ```
   [CheckoutSessions] supabase_uid = <uuid>
   [Webhook] supabase_uid = <uuid>
   [Webhook] Creating order with supabase_uid: <uuid>
   [Webhook] Creating ticket with supabase_uid: <uuid>
   ✅ 票据创建成功: <ticket_id> supabase_uid: <uuid>
   ```

### 测试 3: 验证数据库

在 Supabase SQL Editor 中执行：
```sql
-- 查看最新创建的票
SELECT 
  id,
  short_id,
  holder_email,
  supabase_uid,
  created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 5;
```

**预期结果：** 最新票的 `supabase_uid` 应该不为 null

## ⚠️ 重要注意事项

1. **必须登录才能购买**
   - 现在 checkout_sessions API 要求用户必须登录
   - 如果用户未登录，会返回 401 错误

2. **旧票不会被自动修复**
   - 新代码只会影响新创建的票
   - 旧票需要通过 SQL 脚本手动修复

3. **调试日志**
   - 所有关键步骤都有日志输出
   - 如果看到 `CRITICAL` 日志，说明有问题需要排查

## 📋 检查清单

- [ ] 代码已部署到生产环境
- [ ] 用户购买时必须登录
- [ ] Vercel Logs 显示正确的 supabase_uid
- [ ] Stripe metadata 包含 supabase_uid
- [ ] Webhook 成功创建订单和票务
- [ ] 数据库中新票的 supabase_uid 不为 null
- [ ] 成功页显示正确的票数
- [ ] My Tickets 显示新票

## 🔗 相关文件

- `app/api/checkout_sessions/route.js` - Checkout Sessions API（已修复）
- `app/api/webhook/route.js` - Webhook API（已修复）
- `supabase/migrations/fix_null_supabase_uid_tickets.sql` - 修复旧票的 SQL 脚本
- `supabase/migrations/diagnose_supabase_uid_issue.sql` - 诊断 SQL 脚本

