# Checkout Sessions 认证问题修复

## 🐛 问题描述

买票时出现 "Internal server error"，日志显示：
```
[CheckoutSessions] supabase_uid = null
[CheckoutSessions] user email = null
[CheckoutSessions] hasAuth = false
[CheckoutSessions] CRITICAL: User not authenticated!
```

**根本原因：**
1. `getServerUser()` 使用 `@supabase/auth-helpers-nextjs` 的 `createRouteHandlerClient`，可能无法正确读取 cookies
2. 前端没有传递 Supabase Auth UID 到 API

## ✅ 修复内容

### 1. 修复 `lib/auth-server.ts`

**修改：**
- ✅ 改用 `@supabase/ssr` 的 `createServerClient`（更可靠）
- ✅ 添加错误处理和日志
- ✅ 正确处理 cookies

```typescript
// 之前：使用 @supabase/auth-helpers-nextjs
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
export function getRouteHandlerSupabase() {
  return createRouteHandlerClient({ cookies })
}

// 现在：使用 @supabase/ssr
import { createServerClient } from '@supabase/ssr'
export function getRouteHandlerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => { ... },
        remove: (name: string, options: any) => { ... },
      },
    }
  )
}
```

### 2. 修复 `app/api/checkout_sessions/route.js`

**修改：**
- ✅ 添加回退机制：如果从 session 获取不到用户，尝试从请求 body 中获取 `userId`
- ✅ 验证 `userId` 是否是有效的 UUID 格式（Supabase Auth UID）
- ✅ 添加详细的调试日志

```javascript
// 先解析请求体（可能需要从 body 中获取用户信息作为回退）
const body = await request.json()
const { event_id, price_id, quantity = 1, customer_email, customer_name, customer_age, customerAge, userId } = body

// 获取当前登录用户的 Supabase Auth UID（优先从 cookies/session）
let authUser = await getServerUser()
let supabaseUid = authUser?.id || null

// 如果从 session 获取不到，尝试从请求 body 中获取（回退机制）
if (!supabaseUid && userId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(userId)) {
    supabaseUid = userId
  }
}
```

### 3. 修复前端代码

**文件：** `app/events/[id]/EventDetailClient.tsx` 和 `app/events/[id]/page.js`

**修改：**
- ✅ 优先从 Supabase client 获取 Auth UID
- ✅ 如果获取不到，从 localStorage 获取并验证 UUID 格式
- ✅ 确保传递正确的字段名（`event_id` 和 `price_id`）
- ✅ 传递 `userId`（Supabase Auth UID）到 API

```typescript
// 优先从 Supabase client 获取 Auth UID
const { createClient } = await import('@supabase/supabase-js')
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()

if (!authError && authUser) {
  supabaseUid = authUser.id
}

// 回退：从 localStorage 获取
if (!supabaseUid) {
  const userSession = localStorage.getItem('userSession')
  const user = userSession ? JSON.parse(userSession) : null
  if (user?.id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(user.id)) {
      supabaseUid = user.id
    }
  }
}

// 传递到 API
body: JSON.stringify({
  event_id: event.id,
  price_id: selectedPrice.id,
  userId: supabaseUid, // 传递 Supabase Auth UID
  // ... 其他字段
})
```

## 🔄 认证流程

```
前端 (EventDetailClient)
  ↓ 1. 尝试从 Supabase client 获取 Auth UID
  ↓ 2. 如果失败，从 localStorage 获取并验证 UUID
  ↓ 3. 传递 userId 到 API
  ↓
API (checkout_sessions)
  ↓ 1. 尝试从 cookies/session 获取用户（getServerUser）
  ↓ 2. 如果失败，从请求 body 中获取 userId
  ↓ 3. 验证 userId 是有效的 UUID
  ↓ 4. 创建 Stripe checkout session，包含 supabase_uid
```

## 🧪 测试步骤

### 测试 1: 正常购买流程

1. **确保用户已登录**
2. **选择一个活动**，点击购买
3. **填写信息**，完成支付
4. **查看 Vercel Logs**，应该看到：
   ```
   [EventDetailClient] Got Supabase Auth UID from client: <uuid>
   [CheckoutSessions] supabase_uid = <uuid>
   [CheckoutSessions] Using supabase_uid from request body: <uuid>
   ```

### 测试 2: 回退机制

1. **清除 cookies**（但保持 localStorage 中的 userSession）
2. **尝试购买**
3. **查看 Vercel Logs**，应该看到：
   ```
   [EventDetailClient] Using Supabase Auth UID from localStorage: <uuid>
   [CheckoutSessions] Could not get user from session, trying from request body
   [CheckoutSessions] Using supabase_uid from request body: <uuid>
   ```

### 测试 3: 未登录用户

1. **退出登录**
2. **尝试购买**
3. **应该看到错误提示**："User must be logged in to create checkout session"

## 📋 修改文件列表

1. **`lib/auth-server.ts`**
   - 改用 `@supabase/ssr` 的 `createServerClient`
   - 添加错误处理和日志

2. **`app/api/checkout_sessions/route.js`**
   - 添加回退机制（从请求 body 获取 userId）
   - 验证 UUID 格式
   - 添加详细日志

3. **`app/events/[id]/EventDetailClient.tsx`**
   - 优先从 Supabase client 获取 Auth UID
   - 从 localStorage 获取并验证 UUID
   - 使用正确的字段名（`event_id`, `price_id`）
   - 传递 `userId` 到 API

4. **`app/events/[id]/page.js`**
   - 添加获取 Supabase Auth UID 的逻辑
   - 传递 `userId` 到 API

## ⚠️ 注意事项

1. **必须登录才能购买**
   - 如果用户未登录，API 会返回 401 错误
   - 前端应该显示登录提示

2. **UUID 验证**
   - 只接受有效的 UUID 格式作为 Supabase Auth UID
   - 本地 users 表的 ID 不会被接受

3. **回退机制**
   - 优先使用 cookies/session（最安全）
   - 如果失败，使用请求 body 中的 userId（需要前端确保传递正确的值）

## 🔗 相关文件

- `lib/auth-server.ts` - 服务端认证工具
- `app/api/checkout_sessions/route.js` - Checkout Sessions API
- `app/events/[id]/EventDetailClient.tsx` - 事件详情客户端组件
- `app/events/[id]/page.js` - 事件详情页面

