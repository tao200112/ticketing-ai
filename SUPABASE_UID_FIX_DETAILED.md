# Supabase UID 传递链路修复详细报告

## 📋 修改文件列表

1. **`app/api/checkout_sessions/route.js`** - 修复 checkout sessions，确保写入 supabase_uid
2. **`app/api/webhook/route.js`** - 修复 webhook，确保读取并写入 supabase_uid
3. **`app/api/orders/by-session/route.js`** - 修复 orders by session，确保使用 supabase_uid
4. **`SUPABASE_UID_FIX_COMPLETE.md`** - 修复完成报告（新增）
5. **`SUPABASE_UID_FIX_DETAILED.md`** - 详细修复报告（本文件，新增）

## 🔧 所有变更的代码 Diff

### 1. app/api/checkout_sessions/route.js

**变更位置：** 获取用户信息和创建 Stripe session

**修改前：**
```javascript
// 获取当前登录用户的 Supabase Auth UID
const authUser = await getServerUser()
const supabaseUid = authUser?.id || null

const body = await request.json()
// ... 其他代码

metadata: {
  event_id: event_id,
  price_id: price_id,
  price_name: price.name,
  quantity: quantityNum.toString(),
  customer_name: customer_name || '',
  customer_age: age ? age.toString() : '',
  user_id: finalUserId || '',
  supabase_uid: supabaseUid || '', // 新增：Supabase Auth UID
},
```

**修改后：**
```javascript
// 获取当前登录用户的 Supabase Auth UID
const authUser = await getServerUser()
const supabaseUid = authUser?.id || null
const userEmail = authUser?.email || null

// 调试日志
console.log('[CheckoutSessions] supabase_uid =', supabaseUid)
console.log('[CheckoutSessions] user email =', userEmail)
logger.info('Checkout request - Auth info', { 
  supabaseUid,
  userEmail,
  hasAuth: !!authUser
})

const body = await request.json()
// ... 其他代码

customer_email: customer_email || userEmail,
metadata: {
  event_id: event_id,
  price_id: price_id,
  price_name: price.name,
  quantity: quantityNum.toString(),
  customer_name: customer_name || '',
  customer_age: age ? age.toString() : '',
  user_id: finalUserId || '', // 兼容旧代码
  supabase_uid: supabaseUid || '', // 必须：Supabase Auth UID
  customer_email: customer_email || userEmail || '', // 确保 metadata 中有邮箱
},
```

### 2. app/api/webhook/route.js

**变更位置：** 获取 supabase_uid 和创建订单/票务

**修改前：**
```javascript
// 获取 Supabase Auth UID（优先从 metadata，其次通过邮箱查找）
let supabaseUid = null
if (session.metadata?.supabase_uid) {
  supabaseUid = session.metadata.supabase_uid
} else if (session.customer_email) {
  // 通过邮箱从 auth.users 查找 Supabase UID
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const matchingUser = authUsers?.users?.find(u => u.email === session.customer_email)
  if (matchingUser) {
    supabaseUid = matchingUser.id
    console.log('✅ 通过邮箱找到 Supabase UID:', supabaseUid)
  }
}
```

**修改后：**
```javascript
// 获取 Supabase Auth UID（优先从 metadata）
let supabaseUid = session.metadata?.supabase_uid || null

// 调试日志
console.log('[Webhook] supabase_uid =', supabaseUid)
console.log('[Webhook] session.metadata =', session.metadata)

// 如果 metadata 中没有 supabase_uid，发出警告
if (!supabaseUid) {
  console.warn('[Webhook] Missing supabase_uid in metadata:', session.metadata)
  console.warn('[Webhook] Attempting to find by email:', session.customer_email)
  
  // 回退：通过邮箱从 auth.users 查找 Supabase UID
  if (session.customer_email) {
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const matchingUser = authUsers?.users?.find(u => u.email === session.customer_email)
      if (matchingUser) {
        supabaseUid = matchingUser.id
        console.log('✅ [Webhook] Found Supabase UID by email:', supabaseUid)
      } else {
        console.error('❌ [Webhook] Could not find user by email:', session.customer_email)
      }
    } catch (error) {
      console.error('❌ [Webhook] Error finding user by email:', error)
    }
  }
} else {
  console.log('✅ [Webhook] Using supabase_uid from metadata:', supabaseUid)
}
```

### 3. app/api/orders/by-session/route.js

**变更位置 1：** `createOrderFromStripe` 函数

**修改前：**
```javascript
const { data: order, error: orderError } = await admin
  .from('orders')
  .insert({
    stripe_session_id: session.id,
    user_id: userId,
    supabase_uid: userId, // userId 在这里应该是 Supabase Auth UID
    customer_email: customerEmail,
    // ... 其他字段
  })
```

**修改后：**
```javascript
// 从 metadata 获取 supabase_uid（优先），如果没有则使用 userId
const supabaseUid = metadata.supabase_uid || userId || null

// 调试日志
console.log('[OrdersBySession] supabase_uid =', supabaseUid)
console.log('[OrdersBySession] session.metadata =', metadata)

if (!supabaseUid) {
  console.warn('[OrdersBySession] Missing supabase_uid in metadata and userId:', { metadata, userId })
}

const { data: order, error: orderError } = await admin
  .from('orders')
  .insert({
    stripe_session_id: session.id,
    user_id: userId,
    supabase_uid: supabaseUid, // 使用从 metadata 获取的 supabase_uid
    customer_email: customerEmail,
    // ... 其他字段
  })
```

**变更位置 2：** 创建 tickets

**修改前：**
```javascript
ticketRows.push({
  order_id: order.id,
  // ... 其他字段
  user_id: userId,
  supabase_uid: userId, // userId 在这里应该是 Supabase Auth UID
  // ... 其他字段
})
```

**修改后：**
```javascript
// 从 metadata 获取 supabase_uid（优先），如果没有则使用 userId
const supabaseUid = metadata.supabase_uid || userId || null

ticketRows.push({
  order_id: order.id,
  // ... 其他字段
  user_id: userId,
  supabase_uid: supabaseUid, // 使用从 metadata 获取的 supabase_uid
  // ... 其他字段
})
```

**变更位置 3：** 在 GET 函数中创建 tickets（当订单存在但票务不存在时）

**修改前：**
```javascript
ticketRows.push({
  order_id: order.id,
  // ... 其他字段
  user_id: userId,
  supabase_uid: userId, // userId 在这里应该是 Supabase Auth UID
  // ... 其他字段
})
```

**修改后：**
```javascript
// 从 metadata 获取 supabase_uid（优先），如果没有则使用 userId
const supabaseUidFromMetadata = stripeSession.metadata?.supabase_uid || userId || null
console.log('[OrdersBySession] Creating tickets with supabase_uid:', supabaseUidFromMetadata)

ticketRows.push({
  order_id: order.id,
  // ... 其他字段
  user_id: userId,
  supabase_uid: supabaseUidFromMetadata, // 使用从 metadata 获取的 supabase_uid
  // ... 其他字段
})
```

**变更位置 4：** 查询和过滤 tickets

**修改前：**
```javascript
// Filter tickets based on supabase_uid only
let ownedTickets = tickets
if (user && userId) {
  ownedTickets = tickets.filter((ticket) => {
    return ticket.supabase_uid === userId
  })
}
```

**修改后：**
```javascript
// 调试日志
console.log('[OrdersBySession] supabase_uid =', userId)
console.log('[OrdersBySession] Querying tickets for order:', order.id)

// Filter tickets based on supabase_uid only
let ownedTickets = tickets
if (user && userId) {
  // 只使用 supabase_uid 匹配
  ownedTickets = tickets.filter((ticket) => {
    const matches = ticket.supabase_uid === userId
    if (!matches) {
      console.warn('[OrdersBySession] Ticket does not match supabase_uid:', {
        ticketId: ticket.id,
        ticketSupabaseUid: ticket.supabase_uid,
        currentUserId: userId
      })
    }
    return matches
  })

  console.log('[OrdersBySession] Filtered tickets:', {
    total: tickets.length,
    owned: ownedTickets.length,
    supabaseUid: userId
  })
}
```

## 🔄 Supabase UID 的完整传递链路图

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Checkout Sessions API                              │
│ app/api/checkout_sessions/route.js                          │
│                                                             │
│ Input:                                                      │
│   - Request from frontend (event_id, price_id, etc.)       │
│                                                             │
│ Process:                                                    │
│   1. getServerUser() → authUser                            │
│   2. supabaseUid = authUser.id                             │
│   3. userEmail = authUser.email                            │
│                                                             │
│ Output:                                                     │
│   Stripe Checkout Session with metadata:                   │
│   {                                                         │
│     supabase_uid: "<uuid>",                                │
│     customer_email: "<email>",                             │
│     event_id: "...",                                        │
│     price_id: "...",                                        │
│     ...                                                     │
│   }                                                         │
│                                                             │
│ Logs:                                                       │
│   [CheckoutSessions] supabase_uid = <uuid>                 │
│   [CheckoutSessions] user email = <email>                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    Stripe Payment
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Webhook API                                         │
│ app/api/webhook/route.js                                    │
│                                                             │
│ Input:                                                      │
│   Stripe Event: checkout.session.completed                 │
│   session.metadata.supabase_uid = "<uuid>"                 │
│                                                             │
│ Process:                                                    │
│   1. supabaseUid = session.metadata.supabase_uid           │
│   2. If missing: warn + try to find by email               │
│   3. Insert Order: { supabase_uid: supabaseUid }           │
│   4. Insert Tickets: { supabase_uid: supabaseUid }          │
│                                                             │
│ Output:                                                     │
│   - Order record with supabase_uid                         │
│   - Ticket records with supabase_uid                        │
│                                                             │
│ Logs:                                                       │
│   [Webhook] supabase_uid = <uuid>                          │
│   [Webhook] session.metadata = {...}                       │
│   ✅ [Webhook] Using supabase_uid from metadata: <uuid>    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Orders By Session API                               │
│ app/api/orders/by-session/route.js                          │
│                                                             │
│ Input:                                                      │
│   - session_id from success page                            │
│   - Current user session (getServerUser)                    │
│                                                             │
│ Process:                                                    │
│   1. Retrieve Stripe session                                │
│   2. supabaseUid = session.metadata.supabase_uid            │
│   3. Query tickets: .eq('order_id', order.id)               │
│   4. Filter: ticket.supabase_uid === userId                 │
│                                                             │
│ Output:                                                     │
│   - Filtered tickets (only user's tickets)                 │
│   - Order information                                       │
│                                                             │
│ Logs:                                                       │
│   [OrdersBySession] supabase_uid = <uuid>                  │
│   [OrdersBySession] Filtered tickets: {...}                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Account Page                                        │
│ app/account/page.js                                         │
│                                                             │
│ Input:                                                      │
│   - Current user session                                    │
│                                                             │
│ Process:                                                    │
│   1. client.auth.getUser() → supabaseUid                    │
│   2. Query: .eq('supabase_uid', supabaseUid)                │
│                                                             │
│ Output:                                                     │
│   - User's tickets and orders                               │
│                                                             │
│ Logs:                                                       │
│   🔍 Account Page - Auth UID: <uuid>                       │
│   🎫 Account Page - Tickets returned: X [...]              │
│   📦 Account Page - Orders returned: X [...]               │
└─────────────────────────────────────────────────────────────┘
```

## 📝 每个 API 的最终逻辑

### 1. Checkout Sessions API (`app/api/checkout_sessions/route.js`)

**完整逻辑：**
```javascript
export async function POST(request) {
  // 1. 获取当前登录用户
  const authUser = await getServerUser()
  const supabaseUid = authUser?.id || null
  const userEmail = authUser?.email || null

  // 2. 调试日志
  console.log('[CheckoutSessions] supabase_uid =', supabaseUid)
  console.log('[CheckoutSessions] user email =', userEmail)

  // 3. 解析请求体
  const body = await request.json()
  const { event_id, price_id, quantity, customer_email, ... } = body

  // 4. 创建 Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer_email: customer_email || userEmail,
    metadata: {
      supabase_uid: supabaseUid || '', // 必须字段
      customer_email: customer_email || userEmail || '',
      event_id,
      price_id,
      // ... 其他字段
    }
  })

  return NextResponse.json({ success: true, sessionId: session.id, url: session.url })
}
```

**关键点：**
- ✅ 从 `getServerUser()` 获取 supabase_uid
- ✅ 确保 metadata 中包含 `supabase_uid` 和 `customer_email`
- ✅ 添加调试日志

### 2. Webhook API (`app/api/webhook/route.js`)

**完整逻辑：**
```javascript
export async function POST(request) {
  // 1. 验证 Stripe webhook
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // 2. 从 metadata 读取 supabase_uid
    let supabaseUid = session.metadata?.supabase_uid || null

    // 3. 调试日志
    console.log('[Webhook] supabase_uid =', supabaseUid)
    console.log('[Webhook] session.metadata =', session.metadata)

    // 4. 如果缺失，发出警告并尝试回退
    if (!supabaseUid) {
      console.warn('[Webhook] Missing supabase_uid in metadata:', session.metadata)
      // 回退：通过邮箱查找
    }

    // 5. 创建订单
    const { data: order } = await supabase
      .from('orders')
      .insert({
        supabase_uid: supabaseUid,
        // ... 其他字段
      })

    // 6. 创建票务
    for (let i = 0; i < quantity; i++) {
      await supabase
        .from('tickets')
        .insert({
          supabase_uid: supabaseUid,
          // ... 其他字段
        })
    }
  }
}
```

**关键点：**
- ✅ 从 `session.metadata.supabase_uid` 读取
- ✅ 如果缺失，发出警告并尝试回退
- ✅ 创建 order 和 tickets 时都写入 `supabase_uid`
- ✅ 添加调试日志

### 3. Orders By Session API (`app/api/orders/by-session/route.js`)

**完整逻辑：**
```javascript
export async function GET(request) {
  // 1. 获取当前用户
  const user = await getServerUser()
  const userId = user?.id || null

  // 2. 获取 session_id
  const sessionId = searchParams.get('session_id')

  // 3. 检索 Stripe session
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)

  // 4. 从 metadata 获取 supabase_uid
  const supabaseUid = stripeSession.metadata?.supabase_uid || userId || null

  // 5. 调试日志
  console.log('[OrdersBySession] supabase_uid =', supabaseUid)

  // 6. 查询订单
  let order = await admin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()

  // 7. 如果订单不存在，创建它
  if (!order) {
    order = await createOrderFromStripe(sessionId, userId, customerEmail)
  }

  // 8. 查询票务
  const { data: tickets } = await admin
    .from('tickets')
    .select('*')
    .eq('order_id', order.id)

  // 9. 过滤票务（只使用 supabase_uid）
  let ownedTickets = tickets.filter((ticket) => {
    return ticket.supabase_uid === userId
  })

  // 10. 返回结果
  return NextResponse.json({ ok: true, order, tickets: ownedTickets })
}
```

**关键点：**
- ✅ 从 `stripeSession.metadata.supabase_uid` 获取
- ✅ 创建 order 和 tickets 时使用 `supabase_uid`
- ✅ 查询时只使用 `supabase_uid` 过滤
- ✅ 添加调试日志

## 🧪 部署后测试步骤

### 测试 1: 验证旧票标记（可选）

在 Supabase SQL Editor 中执行：
```sql
-- 查看 supabase_uid 为 null 的票（这些是旧票）
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

**预期结果：** 应该能看到一些旧票的 `supabase_uid` 为 null。

### 测试 2: 使用新账号购买一张票

1. **登录新账号**（或创建新账号）
2. **选择一个活动**，点击购买
3. **填写信息**，完成支付
4. **查看 Vercel Logs**，应该看到：
   ```
   [CheckoutSessions] supabase_uid = <uuid>
   [Webhook] supabase_uid = <uuid>
   [OrdersBySession] supabase_uid = <uuid>
   ```

### 测试 3: 验证 Supabase 数据库

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

-- 验证最新票的 supabase_uid 不为 null
SELECT 
  COUNT(*) as total_tickets,
  COUNT(supabase_uid) as tickets_with_uid,
  COUNT(*) - COUNT(supabase_uid) as tickets_without_uid
FROM tickets
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**预期结果：**
- 最新票的 `supabase_uid` 应该等于当前用户的 Supabase Auth UID（非 null）
- `tickets_without_uid` 应该为 0（对于新票）

### 测试 4: 验证成功页显示

1. **完成支付后**，应该跳转到成功页
2. **检查成功页**，应该显示：
   - "1 ticket created"（或对应数量）
   - 票务信息正常显示
   - QR code 可以生成

### 测试 5: 验证 My Tickets 页面

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

### 测试 6: 验证 Vercel Logs

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

### 测试 7: 验证 RLS Policy

1. **使用新账号登录**
2. **在 Account 页面**，应该能看到自己的票
3. **使用其他账号登录**，不应该看到新账号的票

## ✅ 验证检查清单

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

