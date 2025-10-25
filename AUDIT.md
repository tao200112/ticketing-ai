# 🔍 架构证据级审计报告

> 审核范围: 完整代码库  
> 审核方法: 静态分析 + 调用链追踪  
> 产出时间: 2024年1月

---

## 📊 第一部分：数据源读写清单

### 1.1 Supabase 调用链路

#### 事件与价格查询

**路径:** `app/event/ridiculous-chicken/page.js:44-62`  
**函数:** 硬编码数据（无 Supabase 调用）  
**证据:**
```javascript
const prices = [
  {
    id: 'regular',
    name: 'Regular Ticket (21+)',
    price: 15,
    amount_cents: 1500,
  }
]
```
**问题:** ❌ 未查询 `events`/`prices` 表

**路径:** `app/api/events/route.js`  
**函数:** GET handler  
**状态:** ⚠️ 文件不存在或未实现

#### 订单创建与查询

**路径:** `lib/ticket-service.js:23-187`  
**函数:** `processPaidOrder()`  
**调用链:**
```
Stripe Webhook
  → app/api/stripe/webhook/route.js:93 (handleCheckoutSessionCompleted)
    → lib/ticket-service.js:23 (processPaidOrder)
      → lib/ticket-service.js:42-59 (Supabase 幂等检查)
        → supabase.from('orders').select('*, tickets(*)')
      → lib/ticket-service.js:81-105 (创建 Order)
        → supabase.from('orders').insert()
          ⚠️ 字段映射错误: sessionId → stripe_session_id
      → lib/ticket-service.js:136-185 (创建 Tickets)
        → supabase.from('tickets').insert()
```

**证据 - 字段映射错误:**
```javascript
// lib/ticket-service.js:89
.from('orders')
.insert({
  session_id: sessionId,        // ❌ 应该是 stripe_session_id
  customer_email: customer_email, // ✅ 正确
  event_id: eventId,
  tier: tier,
  total_amount_cents: amount_total, // ❌ 代码用 amount_total
  // ...
})
```

**路径:** `app/api/orders/by-session/route.js:21-30`  
**函数:** `GET /api/orders/by-session`  
**查询:**
```javascript
supabaseAdmin
  .from('orders')
  .select('*, tickets(*)')
  .eq('stripe_session_id', sessionId) // ✅ 正确字段名
  .single();
```
**问题:** ⚠️ 使用 Service Role (绕过 RLS)

#### 票据验证

**路径:** `app/api/tickets/verify/route.js:21-73`  
**函数:** `POST /api/tickets/verify`  
**调用链:**
```
前端扫码/手动输入
  → lib/qr-crypto.js:48 (verifyTicketQRPayload)
    → app/api/tickets/verify/route.js:62
      → supabaseAdmin.from('tickets').select('*, orders(*)')
```

#### 用户认证

**路径:** `app/api/auth/login/route.js:9-77`  
**函数:** `POST /api/auth/login`  
**调用链:**
```javascript
// 行 25-42: Supabase 查询 (使用 anon key)
const supabase = await createServerSupabaseClient()
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();

// 行 49-56: bcrypt 验证
const isValidPassword = await bcrypt.compare(password, user.password_hash)
```
**问题:** ❌ 未使用 Supabase Auth，手动管理密码

**路径:** `app/api/auth/register/route.js:40-112`  
**函数:** `POST /api/auth/register`  
**问题:** 同 login，直接 INSERT users 表

---

### 1.2 Prisma/SQLite 状态

**路径:** `lib/db.js`  
**引用:** `lib/ticket-service.js:1`  
**证据:**
```javascript
// lib/db.js:4-11
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// lib/ticket-service.js:53-66
if (hasSupabase() && supabase) {
  // 走 Supabase 路径
} else {
  // 从未执行到此分支
  existingOrder = await prisma.order.findUnique({
    where: { sessionId },
    include: { tickets: true }
  });
}
```
**结论:** ❌ 未实际使用 Prisma（`hasSupabase()` 始终为 true）

**路径:** `prisma/schema.prisma`  
**状态:** ⚠️ 定义 Order/Ticket 模型，但未被引用

---

### 1.3 localStorage/sessionStorage 清单

| 文件路径 | 行号 | 键名 | 用途 | 数据结构 |
|---------|------|------|------|----------|
| `app/account/page.js` | 14 | `userData` | 用户会话 | `{email, name, id, isLoggedIn}` |
| `app/account/page.js` | 32 | `localUsers` | 本地回退 | `Array<{id, email, password_hash, tickets}>` |
| `app/admin/login/page.js` | 31-32 | `adminToken`, `adminUser` | 管理员会话 | `{token, user}` |
| `app/auth/login/page.js` | 82-92 | `userData` | 登录状态 | `{email, name, age, id, loggedInAt}` |
| `app/auth/register/page.js` | 118 | `userData` | 注册状态 | 同上 |
| `app/success/page.js` | 76, 147 | `recentPurchase` | 购买缓存 | `{sessionId, tickets, event}` |
| `app/success/page.js` | 217-219 | `userTickets` | 票据缓存 | `Array<Ticket>` |
| `app/success/page.js` | 247 | `merchantEvents` | 商家活动缓存 | `Array<Event>` |
| `app/event/ridiculous-chicken/page.js` | 44 | `paymentData` | 支付草稿 | `{eventId, tier, quantity}` |
| `lib/user-storage.js` | 14-27 | `localUsers` | 完整用户数据库 | 所有用户数据 + 票据 |

**关键问题:** ⚠️ `lib/user-storage.js` 是完整的 localStorage 数据库回退

---

## 🔐 第二部分：认证与会话

### 2.1 登录/注册逻辑

#### 登录流程

**文件:** `app/api/auth/login/route.js`  
**行 9-151**

**调用链:**
```javascript
POST /api/auth/login
  → 行 25: createServerSupabaseClient() // anon key
  → 行 31-42: supabase.from('users').select('*').eq('email', email)
  → 行 49: bcrypt.compare(password, user.password_hash) // ⚠️ 手动验证
  → 行 77-85: 返回用户数据（不含 password_hash）
  → 行 89-124: 失败回退到 localStorage (lib/user-storage.js)
```

**问题:**
- ❌ 使用 anon key 直接查询 users 表（无 RLS）
- ❌ 未使用 Supabase Auth
- ❌ 密码明文比较依赖 bcrypt（无速率限制）

#### 注册流程

**文件:** `app/api/auth/register/route.js`  
**行 9-164**

**调用链:**
```javascript
POST /api/auth/register
  → 行 40: createServerSupabaseClient()
  → 行 50-56: 检查邮箱重复
  → 行 60-62: bcrypt.hash(password, 12)
  → 行 66-78: supabase.from('users').insert([{...}])
  → 行 86-105: 失败回退到 localStorage
```

**问题:** 同登录，手动管理密码

### 2.2 会话管理

| 位置 | 存储方式 | 键名 | 过期策略 | 安全性 |
|------|---------|------|----------|--------|
| 前端 | localStorage | `userData` | ❌ 无过期 | 低（XSS 风险） |
| 服务端 | cookies | 自动管理 | ✅ Supabase 管理 | 中（anon key） |
| API 路由 | Service Role Key | `supabaseAdmin` | ❌ 永不过期 | 高（绕过 RLS） |

**证据:**
```javascript
// lib/supabase.ts:28-54
export async function createServerSupabaseClient() {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey, // ⚠️ 使用 anon key
    { cookies: { get, set, remove } }
  )
}

// lib/supabase-admin.ts:7-13
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey, // ✅ 使用 Service Role
)
```

### 2.3 Cookie/Headers 读取点

**路径:** `lib/supabase.ts:38-51`  
**函数:** `createServerSupabaseClient()`  
**证据:**
```javascript
const cookieStore = await cookies()
// 自动读取和设置 Supabase session cookies
```

**路径:** `components/AuthGuard.js:17`  
**证据:**
```javascript
const userData = localStorage.getItem('userData') // ⚠️ 仅前端
```

---

## 🗄️ 第三部分：Schema/RLS 差异

### 3.1 表/字段名差异

| 代码中使用的字段 | 数据库实际字段 | 位置 | 影响 |
|-----------------|---------------|------|------|
| `sessionId` | `stripe_session_id` | orders 表 | ⚠️ INSERT 失败 |
| `email` | `customer_email` | orders 表 | ⚠️ 查询空结果 |
| `amount` | `total_amount_cents` | orders 表 | ⚠️ 类型/精度错误 |
| `paymentIntent` | `stripe_payment_intent` | orders 表 | ⚠️ 未存储 |
| `createdAt` | `created_at` | 所有表 | ✅ 一致（snake_case） |
| `holderEmail` | `holder_email` | tickets 表 | ✅ 一致 |
| `qrPayload` | `qr_payload` | tickets 表 | ✅ 一致 |
| `event.prices` | `prices` 表 + `event_id` FK | events | ⚠️ 未查询 |

**证据 - 错误映射:**
```javascript
// lib/ticket-service.js:89-96
.insert({
  session_id: sessionId,        // ❌ 应该是 stripe_session_id
  customer_email: customer_email, // ✅ 正确
  event_id: eventId,
  tier: tier,
  total_amount_cents: amount_total, // ✅ 正确
})
```

### 3.2 RLS 策略状态

**表: users**
- ❌ 无 RLS 策略
- ❌ 手动认证，绕过 Supabase Auth

**表: orders**
- ❌ 无 RLS 策略
- ⚠️ Service Role 读写（无权限控制）

**表: tickets**
- ❌ 无 RLS 策略
- ⚠️ Service Role 读写

**表: events**
- ❌ 无 RLS 策略
- ⚠️ 数据硬编码，未使用表

**表: prices**
- ❌ 无 RLS 策略
- ⚠️ 未查询

---

## 🔗 第四部分：调用链

### 4.1 事件详情 → 价格 → 下单 → 出票 → 二维码

#### 1. 事件详情加载

**前端:** `app/event/ridiculous-chicken/page.js:7-62`  
**问题:** ❌ 硬编码数据，无 API 调用

```javascript
const event = {
  name: "Ridiculous Chicken Night Event",
  // ... 硬编码
}

const prices = [
  { id: 'regular', name: 'Regular Ticket (21+)', price: 15 }
]
```

#### 2. 下单流程

**调用链:**
```
用户点击购买
  → app/event/ridiculous-chicken/page.js:264-300 (handlePurchase)
    → fetch('/api/checkout_sessions', { eventId, ticketType, quantity })
      → app/api/checkout_sessions/route.js:17 (POST handler)
        → Stripe.checkout.sessions.create()
          → 返回 checkout URL
      → 前端重定向到 Stripe
```

**证据:** `app/api/checkout_sessions/route.js:59-256`

#### 3. 支付完成 → 出票

**调用链:**
```
Stripe Webhook
  → app/api/stripe/webhook/route.js:13 (POST handler)
    → app/api/stripe/webhook/route.js:93 (handleCheckoutSessionCompleted)
      → lib/ticket-service.js:23 (processPaidOrder)
        
        # 步骤 1: 幂等检查
        → lib/ticket-service.js:42-59
          supabase.from('orders').select('*, tickets(*)').eq('session_id', sessionId)
          ⚠️ 字段错误: session_id 应该是 stripe_session_id
        
        # 步骤 2: 创建 Order
        → lib/ticket-service.js:81-105
          supabase.from('orders').insert({...})
          ⚠️ 字段映射错误
        
        # 步骤 3: 生成 QR
        → lib/ticket-service.js:142-156
          generateTicketQRPayload(ticketId, expTs)
          ⚠️ expTs 计算: calculateTicketExpiration(eventEndTime)
        
        # 步骤 4: 创建 Tickets
        → lib/ticket-service.js:158-185
          supabase.from('tickets').insert([{ qr_payload, ...}])
```

**失败点:**
- ⚠️ `session_id` vs `stripe_session_id` 字段名不匹配
- ⚠️ `eventEndTime` 未从数据库获取（硬编码）

#### 4. 前端加载票据（成功页）

**调用链:**
```
用户访问 /success?session_id=cs_xxx
  → app/success/page.js:6 (客户端组件)
    → useEffect: 读取 localStorage.recentPurchase
    → 缺失则调用 fetch('/api/orders/by-session?session_id=...')
      → app/api/orders/by-session/route.js:8 (GET handler)
        → supabaseAdmin.from('orders').select('*, tickets(*)')
          .eq('stripe_session_id', sessionId) // ✅ 正确字段名
        → 返回订单 + 票据数组
```

**问题:** ⚠️ 成功页依赖 localStorage 回退，导致"生成中"卡住

#### 5. 二维码验证

**调用链:**
```
管理员扫描/手动输入
  → app/admin/scan/page.js:15-50
    → POST /api/tickets/verify { qr_payload: "..." }
      → app/api/tickets/verify/route.js:21
        → lib/qr-crypto.js:48 (verifyTicketQRPayload)
          → 验证 HMAC 签名
          → 检查过期时间
        → supabaseAdmin.from('tickets').select('*, orders(*)')
          .eq('short_id', ticketId)
        → 更新 status = 'used'
```

**问题:** ✅ 二维码生成逻辑正确，但依赖数据库字段

---

### 4.2 成功页"生成中"卡住原因

**路径:** `app/success/page.js:147-263`  
**问题:**
```javascript
// 行 147: 从 localStorage 读取
const recentPurchase = JSON.parse(localStorage.getItem('recentPurchase') || '{}')

// 行 193-203: 如果没有，尝试从 API 获取
useEffect(() => {
  if (!recentPurchase.sessionId) {
    fetch(`/api/orders/by-session?session_id=${sessionId}`)
      .then(res => {
        if (!res.ok) {
          // ⚠️ 超时/错误处理缺失
        }
      })
  }
}, [])

// 行 216-224: 渲染逻辑
{tickets.length > 0 ? (
  tickets.map(ticket => <QRCode data={ticket.qrCode} />)
) : (
  <div>Generating QR Code...</div> // ⚠️ 永久显示"生成中"
)}
```

**终止条件缺失:**
- ❌ 无 API 调用超时
- ❌ 无错误重试
- ❌ 无"加载失败"状态

---

## 🛣️ 第五部分：调试与构建

### 5.1 调试页面清单

| 路由 | 文件 | 生产可达? | 保护措施 |
|------|------|----------|---------|
| `/debug-db-status` | `app/debug-db-status/page.js` | ✅ 是 | ❌ 无 |
| `/debug-production` | `app/debug-production/page.js` | ✅ 是 | ❌ 无 |
| `/debug-supabase-config` | `app/debug-supabase-config/page.js` | ✅ 是 | ❌ 无 |
| `/debug-purchase` | `app/debug-purchase/page.js` | ✅ 是 | ❌ 无 |
| `/debug-qr` | `app/debug-qr/page.js` | ✅ 是 | ❌ 无 |
| `/admin/fix-production-data` | `app/admin/fix-production-data/page.js` | ✅ 是 | ⚠️ 依赖 admin 登录（localStorage） |

**证据:** 所有调试页面直接暴露，无环境变量保护或中间件拦截

### 5.2 构建/运行时警告

**警告 1: Prisma Client 未使用**
- **文件:** `lib/db.js`
- **原因:** 已导入但未实际调用
- **位置:** `lib/ticket-service.js:1` (import 但未使用)

**警告 2: 模块解析失败**
- **文件:** `next.config.js:4`
- **原因:** `serverExternalPackages: ['@prisma/client']` 但 Prisma 未使用

### 5.3 环境变量读取点

| 变量 | 客户端/服务端 | 文件 | 行号 |
|------|--------------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 两者 | `lib/supabase.ts` | 11 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 两者 | `lib/supabase.ts` | 12 |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端 | `lib/supabase-admin.ts` | 5 |
| `DATABASE_URL` | 仅服务端 | `prisma/schema.prisma` | 9 |
| `STRIPE_SECRET_KEY` | 仅服务端 | `app/api/checkout_sessions/route.js` | 7 |
| `STRIPE_WEBHOOK_SECRET` | 仅服务端 | `app/api/stripe/webhook/route.js` | 7 |
| `QR_SALT` | 仅服务端 | `lib/qr-crypto.js` | 5 |

**问题:**
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 应仅在服务端，已正确
- ⚠️ `ANON_KEY` 暴露在客户端，需 RLS 保护（但 RLS 未启用）

---

## 📋 总结：证据清单

### 关键问题总结

1. **字段映射错误**
   - `sessionId` → `stripe_session_id` (写入失败)
   - 导致订单未写入数据库，成功页查询空

2. **无 RLS 策略**
   - 所有表数据可被任意访问
   - Anon key 相当于服务端密钥

3. **localStorage 回退**
   - 15+ 文件依赖 localStorage
   - `lib/user-storage.js` 是完整数据库

4. **调试页暴露**
   - 6 个调试页面在生产环境可访问

5. **认证混乱**
   - 手动管理 users 表 + bcrypt
   - 未使用 Supabase Auth
   - 无会话管理

6. **事件数据硬编码**
   - 未使用 events/prices 表
   - 前端直接渲染静态数据
