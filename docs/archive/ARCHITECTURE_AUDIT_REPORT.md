# 🏗️ 架构审计报告与整改蓝图

> 生成时间: 2024年1月  
> 审核范围: 完整代码库与配置分析

---

## 📊 一、数据源分析

### 1.1 数据源并存情况

| 数据源 | 状态 | 被调用位置 | 用途 |
|--------|------|-----------|------|
| **Prisma + SQLite** | ❌ 已配置未使用 | `lib/db.js` | 本地开发数据库 |
| **Supabase (PostgreSQL)** | ✅ 主要使用 | `lib/supabase.ts`, `lib/supabase-admin.ts` | 生产数据库 |
| **localStorage** | ⚠️ 混合使用 | 15+ 文件 | 回退存储/会话 |

#### 📍 具体调用位置

**Prisma:**
- `lib/db.js` - PrismaClient 初始化
- `prisma/schema.prisma` - SQLite 模型定义 (Order, Ticket)
- 未实际被代码使用（`lib/ticket-service.js` 有 import 但走 Supabase）

**Supabase:**
- 服务端: `lib/supabase.ts` → `createServerSupabaseClient()` (使用 anon key + cookies)
- 管理端: `lib/supabase-admin.ts` → Service Role key (绕过 RLS)
- 客户端: `lib/supabaseClient.js` → anon key
- API 路由: `app/api/auth/*`, `app/api/orders/*`, `app/api/tickets/*`

**localStorage 使用清单:**
```
app/account/page.js              - 用户数据 + 票据
app/admin/login/page.js          - Admin token + user
app/auth/login/page.js           - 登录用户
app/auth/register/page.js        - 注册用户
app/success/page.js              - 购买记录 + 票据
app/event/ridiculous-chicken/page.js - 支付数据
lib/user-storage.js              - 模拟数据库
app/debug-production/page.js     - 调试数据
app/debug-purchase/page.js       - 测试数据
```

---

## 🔐 二、认证系统分析

### 2.1 登录/注册逻辑位置

| 端点 | 文件 | 逻辑流程 | RLS 对齐 |
|------|------|---------|---------|
| POST `/api/auth/login` | `app/api/auth/login/route.js` | 1. 检查 Supabase<br>2. 查询 users 表 (无 RLS 校验)<br>3. bcrypt 验证密码<br>4. 回退 localStorage<br>5. 返回用户数据 | ❌ 未使用 Supabase Auth |
| POST `/api/auth/register` | `app/api/auth/register/route.js` | 1. 检查 Supabase<br>2. 直接 INSERT users<br>3. 回退 localStorage | ❌ 未使用 Supabase Auth |

**问题点:**
- ❌ 未使用 Supabase Auth 服务，而是手动管理 `users` 表
- ❌ 认证状态存储在 localStorage (非安全)
- ❌ 服务端用 anon key 直接查询，绕过 RLS
- ❌ RLS 策略未定义或不生效

### 2.2 会话管理

| 位置 | 方式 | 安全性 |
|------|------|--------|
| 前端 | `localStorage.getItem('userData')` | 低 |
| 服务端 | cookies + createServerClient | 中 (anon key) |
| API | Service Role Key | 高 (绕过 RLS) |

---

## 🗄️ 三、Schema/RLS 差异清单

### 3.1 字段命名差异

| Prisma Schema | Supabase Table | 差异 | 影响 |
|--------------|----------------|------|------|
| `Order.sessionId` | `orders.stripe_session_id` | 字段名不同 | API 查询失败 |
| `Order.email` | `orders.customer_email` | 字段名不同 | 数据不一致 |
| `Order.amount` | `orders.total_amount_cents` | 字段名不同 | 计算错误 |
| `Ticket.holderEmail` | `tickets.holder_email` | 一致 | ✅ |
| `Ticket.qrPayload` | `tickets.qr_payload` | 一致 | ✅ |

### 3.2 关系差异

| 关系 | Prisma | Supabase | 问题 |
|------|--------|----------|------|
| Order → Ticket | `Order.tickets` | `orders.tickets` | 外键: `order_id` 一致 ✅ |
| - | `Order.id` (String cuid) | `orders.id` (UUID) | ID 类型不兼容 ⚠️ |

### 3.3 RLS 策略状态

**当前状态:** ⚠️ 部分启用，策略不完整

```sql
-- 缺少的 RLS 策略:
-- ❌ users 表无 RLS 策略 (手动认证)
-- ❌ orders 表无策略 (Service Role 读取)
-- ❌ tickets 表无策略 (Service Role 写入)
-- ❌ events 表无策略
-- ❌ prices 表无策略
```

---

## 🔗 四、调用链分析

### 4.1 事件详情查询

```
用户访问 → app/events/[slug]/page.js
          ↓
      客户端查询 (hardcoded data)
          ↓
     ❌ 未使用 Supabase events 表
```

**问题:** 事件数据硬编码在前端，未使用数据库

### 4.2 价格查询

```
前端: app/event/ridiculous-chicken/page.js
      ↓ prices: [{ name, price, amount_cents }]
      ↓ 硬编码数据
      ↓
   ❌ 未查询 Supabase prices 表
```

### 4.3 订单创建流程

```
Stripe Webhook → app/api/stripe/webhook/route.js
                 ↓
              handleCheckoutSessionCompleted()
                 ↓
         processPaidOrder() ← lib/ticket-service.js
         ├─ hasSupabase() 检查
         ├─ supabase.from('orders').insert()  [Supabase]
         ├─ 或 prisma.order.create() [SQLite 未使用]
         ↓
     生成二维码 ← generateTicketQRPayload()
      ↓
    qr_payload 写入 tickets 表
```

**问题点:**
- ⚠️ 字段映射错误: `sessionId` vs `stripe_session_id`
- ⚠️ 金额字段: `amount` vs `total_amount_cents`
- ✅ 二维码生成逻辑正确

### 4.4 出票与二维码生成

| 环节 | 位置 | 函数/API | 数据库操作 |
|------|------|---------|-----------|
| 支付完成 | `app/api/stripe/webhook/route.js` | `handleCheckoutSessionCompleted()` | 创建 Order |
| 票据生成 | `lib/ticket-service.js` | `processPaidOrder()` | 创建 Tickets |
| QR 生成 | `lib/qr-crypto.js` | `generateTicketQRPayload()` | 无 DB |
| QR 写入 | `lib/ticket-service.js:185` | INSERT `qr_payload` | Supabase |
| 前端加载 | `app/success/page.js` | 查询 `/api/orders/by-session` | 读取 QR |

**完整链路:**
```
Stripe → webhook → processPaidOrder() 
  → INSERT orders (stripe_session_id)
  → INSERT tickets (qr_payload)
  → frontend query by session_id
```

---

## 🛣️ 五、调试页与生产路由

### 5.1 调试页面清单

| 路由 | 文件 | 用途 | 生产暴露? |
|------|------|------|----------|
| `/debug-db-status` | `app/debug-db-status/page.js` | 数据库连接状态 | ❌ |
| `/debug-production` | `app/debug-production/page.js` | 生产数据诊断 | ❌ |
| `/debug-supabase-config` | `app/debug-supabase-config/page.js` | 配置检查 | ❌ |
| `/debug-purchase` | `app/debug-purchase/page.js` | 购买流程测试 | ❌ |
| `/debug-qr` | `app/debug-qr/page.js` | 二维码测试 | ❌ |
| `/admin/fix-production-data` | `app/admin/fix-production-data/page.js` | 数据修复工具 | ❌ |

**建议:** 使用环境变量保护或中间件拦截

### 5.2 生产路由

```
✅ /api/auth/login
✅ /api/auth/register
✅ /api/stripe/webhook
✅ /api/orders/by-session
✅ /api/tickets/verify
✅ /checkout_sessions
❌ /api/debug/* (应移除)
```

---

## 📦 六、依赖分析

### 6.1 构建时警告

| 警告 | 源头 | 原因 |
|------|------|------|
| Module not found | `@prisma/client` | SQLite provider 但未使用 |
| Warning: Invalid key | `lib/db.js` | PrismaClient 初始化但未连接 |

### 6.2 未使用的依赖

```json
{
  "@prisma/client": "^6.18.0",  // 未使用 (SQLite)
  "prisma": "^6.18.0"           // 未使用 (schema 过时)
}
```

### 6.3 运行时缺失检查

```javascript
// lib/supabase.ts
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 环境变量缺失')
  return null  // ❌ 静默失败
}
```

---

## 🔑 七、环境变量分析

### 7.1 环境变量读取点

| 变量 | 服务端/客户端 | 位置 | 是否泄漏 |
|------|--------------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | 两者 | `lib/supabase.ts` | ✅ 公开 (必须) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 两者 | `lib/supabase.ts` | ✅ 公开 (必须) |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端 | `lib/supabase-admin.ts` | ✅ 安全 |
| `DATABASE_URL` | 仅服务端 | `prisma/schema.prisma` | ❌ 未使用 |
| `STRIPE_SECRET_KEY` | 仅服务端 | `app/api/stripe/*` | ✅ 安全 |

### 7.2 安全性评估

| 配置 | 状态 | 风险 |
|------|------|------|
| Service Role Key | ✅ 仅服务端 | 低 |
| Anon Key | ⚠️ 客户端暴露 | 中 (需 RLS 保护) |
| Anon Key 在服务端 | ❌ 未正确使用 | 高 (应使用 Service Role 或 RLS) |

**问题:**
- 服务端 API 使用 `createServerSupabaseClient()` (anon key)，应改用 Service Role 或 RLS
- RLS 策略未定义，anon key 可访问所有数据

---

## 🎯 八、整改蓝图

### 8.1 统一数据源架构

```
目标: 仅使用 Supabase PostgreSQL
```

```
┌─────────────────────────────────────────┐
│        前端组件 (React)                  │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   中间层: lib/supabase-{client,server}  │
│   - client: 客户端组件用                │
│   - server: API 路由用                  │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       Supabase PostgreSQL               │
│   ┌───────────────────────────────┐    │
│   │  RLS 策略层                   │    │
│   └───────────────────────────────┘    │
│   ┌───────────────────────────────┐    │
│   │  数据层 (tables)              │    │
│   │  - users, events, orders      │    │
│   │  - tickets, prices            │    │
│   └───────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 8.2 需要新建的抽象层

#### A. 数据访问层

**新建: `lib/db/supabase-client.ts`**
```typescript
// 统一客户端实例
export const getClient = () => { /* ... */ }
```

**新建: `lib/db/supabase-server.ts`**
```typescript
// 服务端实例 (带 RLS 或 Service Role)
export const getServer = () => { /* ... */ }
```

#### B. Schema 映射层

**新建: `lib/schema-mapper.ts`**
```typescript
// 统一字段映射
export const mapOrderToSchema = (order) => ({
  stripe_session_id: order.sessionId,
  customer_email: order.email,
  total_amount_cents: order.amount,
  // ...
})
```

### 8.3 需要删除的内容

| 项目 | 原因 |
|------|------|
| `prisma/` 目录 | 不再使用 SQLite |
| `lib/db.js` | Prisma 初始化 |
| `lib/user-storage.js` | localStorage 回退 |
| 所有 `localStorage.*` 调用 | 改用 Supabase + cookies |
| `app/api/debug/*` | 生产环境不应暴露 |

### 8.4 Schema 字段映射表

| 旧字段 (Prisma/代码) | 新字段 (Supabase) | 位置 |
|---------------------|------------------|------|
| `sessionId` | `stripe_session_id` | orders |
| `email` | `customer_email` | orders |
| `amount` | `total_amount_cents` | orders |
| `paymentIntent` | `stripe_payment_intent` | orders |
| `createdAt` | `created_at` | 所有表 |

### 8.5 RLS 目标策略

```sql
-- users 表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

-- orders 表
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" 
  ON orders FOR SELECT 
  USING (customer_email = (SELECT email FROM users WHERE id = auth.uid()));

-- tickets 表
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" 
  ON tickets FOR SELECT 
  USING (holder_email = (SELECT email FROM users WHERE id = auth.uid()));
```

### 8.6 健康检查端点

**新建: `app/api/health/route.js`**
```javascript
export async function GET() {
  return Response.json({
    status: 'ok',
    database: await checkSupabase(),
    auth: await checkAuth(),
    timestamp: new Date().toISOString()
  })
}
```

### 8.7 日志点

```typescript
// lib/logger.ts
export const logEvent = (event, data) => {
  if (process.env.NODE_ENV === 'production') {
    // 发送到 Supabase Logs 或第三方服务
  }
}
```

---

## 🚀 九、最小风险起步 PR

### PR #1: 数据结构隔离 (零业务风险)

**目标:** 修复字段映射，统一命名规范

**改动:**
- [ ] 创建 `lib/schema-mapper.ts` 映射层
- [ ] 更新 API 查询使用新字段名
- [ ] 添加 TypeScript 类型定义

**影响范围:** 仅数据访问层  
**风险评估:** 低

### PR #2: 移除 localStorage (低风险)

**目标:** 移除所有 localStorage 回退逻辑

**改动:**
- [ ] 删除 `lib/user-storage.js`
- [ ] 删除所有 `localStorage.*` 调用
- [ ] 改用 Supabase + cookies 会话管理
- [ ] 更新前端组件

**影响范围:** 认证与数据存储  
**风险评估:** 中

### PR #3: 添加观测与监控 (零风险)

**目标:** 添加健康检查与日志

**改动:**
- [ ] 新建 `/api/health` 端点
- [ ] 添加结构化日志
- [ ] 添加 Supabase 连接监控
- [ ] 移除所有调试页面

**影响范围:** 运维与监控  
**风险评估:** 低

---

## 📋 附录

### A. 文件清单

- [ ] 需要修改: 15+ 文件
- [ ] 需要删除: 10+ 文件
- [ ] 需要新建: 5+ 文件

### B. 预估工时

- PR #1: 2-3 小时
- PR #2: 4-6 小时
- PR #3: 2 小时
- **总计:** 8-11 小时

### C. 依赖项

- Supabase Migration 脚本
- RLS 策略更新
- 前端组件更新
- 环境变量配置检查
