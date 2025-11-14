# Supabase UID 传递链路修复完成报告

## 🐛 问题描述

新票的 `supabase_uid = null`，导致：
- 新订单成功页显示 "0 tickets created"
- My Tickets 不显示新票
- 新票无法生成 QR code
- Supabase 记录中最新 tickets 的 supabase_uid 全是 null

**根本原因**：`supabase_uid` 在 checkout → webhook → insert tickets 这一链路中丢失了。

## ✅ 修复内容

### Task 1: 修复 checkout_sessions 路由 ✅

**文件：** `app/api/checkout_sessions/route.js`

**修改内容：**
1. ✅ 从当前 Supabase session 获取 UID：
   ```javascript
   const authUser = await getServerUser()
   const supabaseUid = authUser?.id || null
   const userEmail = authUser?.email || null
   ```

2. ✅ 在 Stripe checkout session metadata 中写入：
   ```javascript
   metadata: {
     supabase_uid: supabaseUid || '', // 必须：Supabase Auth UID
     customer_email: customer_email || userEmail || '', // 确保 metadata 中有邮箱
     // ... 其他字段
   }
   ```

3. ✅ 添加调试日志：
   ```javascript
   console.log('[CheckoutSessions] supabase_uid =', supabaseUid)
   console.log('[CheckoutSessions] user email =', userEmail)
   ```

### Task 2: 修复 webhook 路由 ✅

**文件：** `app/api/webhook/route.js`

**修改内容：**
1. ✅ 读取 metadata：
   ```javascript
   let supabaseUid = session.metadata?.supabase_uid || null
   ```

2. ✅ 插入 order 时写 supabase_uid：
   ```javascript
   await supabase.from("orders").insert({
     supabase_uid: supabaseUid,
     // ... 其他字段
   })
   ```

3. ✅ 插入 tickets 时写 supabase_uid：
   ```javascript
   await supabase.from("tickets").insert({
     supabase_uid: supabaseUid,
     // ... 其他字段
   })
   ```

4. ✅ 如果 supabaseUid 是 undefined，console.warn：
   ```javascript
   if (!supabaseUid) {
     console.warn('[Webhook] Missing supabase_uid in metadata:', session.metadata)
     // 回退：通过邮箱查找
   }
   ```

5. ✅ 添加调试日志：
   ```javascript
   console.log('[Webhook] supabase_uid =', supabaseUid)
   console.log('[Webhook] session.metadata =', session.metadata)
   ```

### Task 3: 修复 orders/by-session 路由 ✅

**文件：** `app/api/orders/by-session/route.js`

**修改内容：**
1. ✅ 在 `createOrderFromStripe` 函数中从 metadata 获取 supabase_uid：
   ```javascript
   const supabaseUid = metadata.supabase_uid || userId || null
   ```

2. ✅ 创建 order 时使用 supabase_uid：
   ```javascript
   await admin.from('orders').insert({
     supabase_uid: supabaseUid,
     // ... 其他字段
   })
   ```

3. ✅ 创建 tickets 时使用 supabase_uid：
   ```javascript
   ticketRows.push({
     supabase_uid: supabaseUid,
     // ... 其他字段
   })
   ```

4. ✅ 查询时只使用 supabase_uid：
   ```javascript
   ownedTickets = tickets.filter((ticket) => {
     return ticket.supabase_uid === userId
   })
   ```

5. ✅ 添加调试日志：
   ```javascript
   console.log('[OrdersBySession] supabase_uid =', supabaseUid)
   console.log('[OrdersBySession] Filtered tickets:', { total, owned, supabaseUid })
   ```

## 📋 修改文件列表

1. **`app/api/checkout_sessions/route.js`**
   - 添加从 session 获取 supabase_uid 的逻辑
   - 确保 metadata 中包含 supabase_uid 和 customer_email
   - 添加调试日志

2. **`app/api/webhook/route.js`**
   - 从 metadata 读取 supabase_uid
   - 创建 order 和 tickets 时写入 supabase_uid
   - 添加警告日志（当 supabase_uid 缺失时）
   - 添加调试日志

3. **`app/api/orders/by-session/route.js`**
   - 在 `createOrderFromStripe` 中从 metadata 获取 supabase_uid
   - 创建 order 和 tickets 时使用 supabase_uid
   - 查询时只使用 supabase_uid 过滤
   - 添加调试日志

## 🔄 Supabase UID 的完整传递链路图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Checkout Sessions API                                    │
│    app/api/checkout_sessions/route.js                       │
│                                                             │
│    getServerUser() → authUser.id                            │
│    ↓                                                        │
│    Stripe Checkout Session Metadata:                       │
│    {                                                         │
│      supabase_uid: authUser.id,                            │
│      customer_email: authUser.email,                        │
│      ...                                                    │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Stripe Webhook                                           │
│    app/api/webhook/route.js                                 │
│                                                             │
│    session.metadata.supabase_uid                           │
│    ↓                                                        │
│    Insert Order:                                            │
│    { supabase_uid: session.metadata.supabase_uid }         │
│    ↓                                                        │
│    Insert Tickets:                                          │
│    { supabase_uid: session.metadata.supabase_uid }         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Orders By Session API                                    │
│    app/api/orders/by-session/route.js                       │
│                                                             │
│    stripeSession.metadata.supabase_uid                      │
│    ↓                                                        │
│    Query Tickets:                                           │
│    .eq('supabase_uid', userId)                              │
│    ↓                                                        │
│    Filter: ticket.supabase_uid === userId                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Account Page                                             │
│    app/account/page.js                                      │
│                                                             │
│    client.auth.getUser() → supabaseUid                      │
│    ↓                                                        │
│    Query: .eq('supabase_uid', supabaseUid)                  │
└─────────────────────────────────────────────────────────────┘
```

## 📝 每个 API 的最终逻辑

### 1. Checkout Sessions API

```javascript
// 获取当前登录用户
const authUser = await getServerUser()
const supabaseUid = authUser?.id || null
const userEmail = authUser?.email || null

// 创建 Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  customer_email: customer_email || userEmail,
  metadata: {
    supabase_uid: supabaseUid || '', // 必须字段
    customer_email: customer_email || userEmail || '',
    // ... 其他字段
  }
})

// 调试日志
console.log('[CheckoutSessions] supabase_uid =', supabaseUid)
```

### 2. Webhook API

```javascript
// 从 metadata 读取 supabase_uid
let supabaseUid = session.metadata?.supabase_uid || null

// 调试日志
console.log('[Webhook] supabase_uid =', supabaseUid)
console.log('[Webhook] session.metadata =', session.metadata)

// 如果缺失，发出警告
if (!supabaseUid) {
  console.warn('[Webhook] Missing supabase_uid in metadata:', session.metadata)
  // 回退：通过邮箱查找
}

// 创建订单
await supabase.from('orders').insert({
  supabase_uid: supabaseUid,
  // ... 其他字段
})

// 创建票务
await supabase.from('tickets').insert({
  supabase_uid: supabaseUid,
  // ... 其他字段
})
```

### 3. Orders By Session API

```javascript
// 从 metadata 获取 supabase_uid
const metadata = session.metadata || {}
const supabaseUid = metadata.supabase_uid || userId || null

// 调试日志
console.log('[OrdersBySession] supabase_uid =', supabaseUid)

// 创建订单
await admin.from('orders').insert({
  supabase_uid: supabaseUid,
  // ... 其他字段
})

// 创建票务
ticketRows.push({
  supabase_uid: supabaseUid,
  // ... 其他字段
})

// 查询票务（只使用 supabase_uid）
ownedTickets = tickets.filter((ticket) => {
  return ticket.supabase_uid === userId
})
```

## 🧪 部署后测试步骤

### 步骤 1: 验证旧票标记（可选）

在 Supabase SQL Editor 中执行：
```sql
-- 查看 supabase_uid 为 null 的票
SELECT 
  id,
  short_id,
  holder_email,
  supabase_uid,
  created_at
FROM tickets
WHERE supabase_uid IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

**注意**：这些旧票不会被删除，但新票应该都有 `supabase_uid`。

### 步骤 2: 使用新账号购买一张票

1. **登录新账号**（或创建新账号）
2. **选择一个活动**，点击购买
3. **填写信息**，完成支付
4. **查看 Vercel Logs**，应该看到：
   ```
   [CheckoutSessions] supabase_uid = <uuid>
   [Webhook] supabase_uid = <uuid>
   [OrdersBySession] supabase_uid = <uuid>
   ```

### 步骤 3: 验证 Supabase 数据库

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

-- 验证 supabase_uid 不为 null
SELECT 
  COUNT(*) as total_tickets,
  COUNT(supabase_uid) as tickets_with_uid,
  COUNT(*) - COUNT(supabase_uid) as tickets_without_uid
FROM tickets
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**预期结果**：
- 最新票的 `supabase_uid` 应该等于当前用户的 Supabase Auth UID（非 null）
- `tickets_without_uid` 应该为 0（对于新票）

### 步骤 4: 验证成功页显示

1. **完成支付后**，应该跳转到成功页
2. **检查成功页**，应该显示：
   - "1 ticket created"（或对应数量）
   - 票务信息正常显示
   - QR code 可以生成

### 步骤 5: 验证 My Tickets 页面

1. **打开 Account 页面** (`/account`)
2. **查看 My Tickets 部分**，应该显示：
   - 最新购买的票
   - 票务信息完整
   - QR code 可以显示

3. **查看浏览器控制台**，应该看到：
   ```
   🔍 Account Page - Auth UID: <uuid>
   🎫 Account Page - Tickets returned: 1 [...]
   ```

### 步骤 6: 验证 Vercel Logs

在 Vercel Dashboard 中查看 Logs，应该看到：

**Checkout Sessions:**
```
[CheckoutSessions] supabase_uid = <uuid>
[CheckoutSessions] user email = <email>
```

**Webhook:**
```
[Webhook] supabase_uid = <uuid>
[Webhook] session.metadata = { supabase_uid: '<uuid>', ... }
✅ [Webhook] Using supabase_uid from metadata: <uuid>
```

**Orders By Session:**
```
[OrdersBySession] supabase_uid = <uuid>
[OrdersBySession] Filtered tickets: { total: 1, owned: 1, supabaseUid: '<uuid>' }
```

### 步骤 7: 验证 RLS Policy

1. **使用新账号登录**
2. **在 Account 页面**，应该能看到自己的票
3. **使用其他账号登录**，不应该看到新账号的票

## ⚠️ 注意事项

1. **旧票的 supabase_uid 为 null**
   - 这些票不会被自动修复
   - 如果需要修复，可以运行迁移脚本：
     ```sql
     -- 通过邮箱匹配更新旧票的 supabase_uid
     UPDATE tickets t
     SET supabase_uid = au.id
     FROM auth.users au
     WHERE t.holder_email = au.email
       AND t.supabase_uid IS NULL;
     ```

2. **调试日志**
   - 所有调试日志都会输出到 Vercel Logs
   - 如果看到 `Missing supabase_uid` 警告，说明传递链路有问题

3. **回退机制**
   - Webhook 中如果 metadata 没有 supabase_uid，会尝试通过邮箱查找
   - 但这不应该发生，如果发生说明 checkout_sessions 有问题

## 📊 验证检查清单

- [ ] 新票的 `supabase_uid` 不为 null
- [ ] 成功页显示正确的票数
- [ ] My Tickets 显示新票
- [ ] QR code 可以生成
- [ ] Vercel Logs 显示正确的 supabase_uid
- [ ] RLS Policy 正常工作（只能看到自己的票）

## 🔗 相关文件

- `app/api/checkout_sessions/route.js` - Checkout Sessions API
- `app/api/webhook/route.js` - Webhook API
- `app/api/orders/by-session/route.js` - Orders By Session API
- `app/account/page.js` - Account 页面
- `lib/auth-server.ts` - Auth Server Helper

