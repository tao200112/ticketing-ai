# 🎯 统一与修复总计划

> 目标: 统一到 Supabase + 移除所有技术债  
> 阶段: 6 个渐进式 PR  
> 原则: 不改业务逻辑，只做架构治理

---

## 📋 目标状态

### 架构目标

1. **单一数据源** = Supabase PostgreSQL
2. **统一认证** = Supabase Auth (非手动管理)
3. **无本地回退** = 删除 localStorage + Prisma
4. **RLS 到位** = 所有表启用策略
5. **服务端幂等** = 订单/票据一次写入 `qr_payload`
6. **生产清洁** = 无调试页、有健康检查
7. **结构化日志** = 所有 API 日志

---

## 🚀 PR 计划

### PR-1: 统一数据源 & 关闭调试页（零业务风险）

**目标:** 删除未使用的 Prisma，关闭调试页暴露

#### 改动文件清单

**删除:**
```
prisma/schema.prisma
prisma/migrations/
lib/db.js
```

**修改:**
```
package.json (删除 @prisma/client, prisma 依赖)
next.config.js (删除 serverExternalPackages 中的 @prisma/client)
lib/ticket-service.js (删除 import { prisma } from './db')
lib/ticket-service.js:53-66 (删除 Prisma 回退路径)
```

**调试页保护:**
```
app/debug-*/page.js → 添加环境变量检查
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }
```

#### 风险点

- ✅ 零业务风险（Prisma 未使用）
- ⚠️ 需确认无遗留引用

#### 回滚方案

```bash
git revert <PR-1-commit>
npm install @prisma/client prisma  # 重新安装依赖
```

#### 验收标准

- [ ] `npm run build` 无 Prisma 警告
- [ ] 调试页面在生产环境返回 404
- [ ] 所有 API 仍正常工作

---

### PR-2: 字段/关系/状态映射层（仅数据层）

**目标:** 创建统一的数据映射层，修复字段名不一致

#### 改动文件清单

**新建:**
```
lib/db/field-mapper.ts
lib/db/types.ts
```

**修改:**
```
lib/ticket-service.js
  - 使用 field-mapper 统一字段映射
  - 修复 sessionId → stripe_session_id
app/api/orders/by-session/route.js
  - 使用统一类型定义
app/api/auth/login/route.js
  - 使用统一类型定义
```

#### 映射表（旧→新）

| 表 | 旧字段 | 新字段 | 类型 | 位置 |
|----|--------|--------|------|------|
| orders | `sessionId` | `stripe_session_id` | TEXT | 查询/写入 |
| orders | `email` | `customer_email` | TEXT | 查询 |
| orders | `amount` | `total_amount_cents` | INTEGER | 写入 |
| orders | `paymentIntent` | `stripe_payment_intent` | TEXT | 写入 |
| tickets | `holderEmail` | `holder_email` | TEXT | ✅ 已一致 |
| tickets | `qrPayload` | `qr_payload` | TEXT | ✅ 已一致 |

#### field-mapper.ts 示例

```typescript
// lib/db/field-mapper.ts
export const mapOrderForInsert = (stripeSession: any) => ({
  stripe_session_id: stripeSession.id, // ✅ 修复
  customer_email: stripeSession.customer_email,
  total_amount_cents: stripeSession.amount_total,
  stripe_payment_intent: stripeSession.payment_intent?.id,
  // ...
})
```

#### 风险点

- ⚠️ 字段映射错误导致订单写入失败
- ⚠️ 需数据迁移（如已存在错误数据）

#### 回滚方案

```bash
# 恢复旧字段名
git revert <PR-2-commit>
```

#### 验收标准

- [ ] 测试下单流程 → 订单写入数据库
- [ ] 成功页能查询到订单
- [ ] 二维码生成成功

---

### PR-3: RLS/Policy 最小脚本（附带回滚）

**目标:** 为所有表启用 RLS 策略

#### RLS 策略脚本

**新建:** `supabase/migrations/20250115_enable_rls.sql`

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- users 表策略
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- orders 表策略
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (customer_email IN (
    SELECT email FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Service can create orders"
  ON orders FOR INSERT
  WITH CHECK (true); -- Service Role 允许

-- tickets 表策略
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (holder_email IN (
    SELECT email FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Service can manage tickets"
  ON tickets FOR ALL
  USING (true); -- Service Role 允许

-- events 表策略（公开读取）
CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'published');

-- prices 表策略（公开读取）
CREATE POLICY "Anyone can view active prices"
  ON prices FOR SELECT
  USING (is_active = TRUE);
```

#### 回滚脚本

**新建:** `supabase/migrations/rollback_disable_rls.sql`

```sql
-- 禁用 RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;

-- 删除所有策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Service can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Service can manage tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
DROP POLICY IF EXISTS "Anyone can view active prices" ON prices;
```

#### 风险点

- ⚠️ RLS 策略过严导致 API 失败
- ⚠️ 需测试所有用户角色

#### 回滚方案

```bash
# 执行回滚脚本
psql $DATABASE_URL -f supabase/migrations/rollback_disable_rls.sql
```

#### 验收标准

- [ ] 正常用户能查看自己的订单/票据
- [ ] 管理员能访问所有数据
- [ ] 匿名用户能查看公开事件

---

### PR-4: 活动详情页接入新数据层（日期/票价渲染）

**目标:** 从硬编码改为从 Supabase 查询

#### 改动文件清单

**新建:**
```
app/api/events/[slug]/route.js
app/api/events/[slug]/prices/route.js
```

**修改:**
```
app/event/[slug]/page.js
  - 移除硬编码数据
  - 从 API 获取事件 + 价格
app/event/ridiculous-chicken/page.js
  - 改为使用统一路由 [slug]
```

#### API 接口契约

```typescript
// GET /api/events/[slug]
Response: {
  id: string
  title: string
  description: string
  start_at: string // ISO 8601
  end_at: string
  venue_name: string
  address: string
  status: 'published' | 'draft'
  poster_url: string
  prices: Price[]
}

// GET /api/events/[slug]/prices
Response: {
  prices: Array<{
    id: string
    name: string
    amount_cents: number
    currency: string
    inventory: number
    sold_count: number
    limit_per_user: number
    is_active: boolean
  }>
}
```

#### 前端渲染逻辑

```typescript
// app/event/[slug]/page.js
const { data: event } = await fetch(`/api/events/${slug}`)
const { data: prices } = await fetch(`/api/events/${slug}/prices`)

// 渲染日期: format(new Date(event.start_at), 'MMM dd, yyyy HH:mm')
// 渲染票价: (p.price.amount_cents / 100).toFixed(2)
```

#### 空态处理

```typescript
if (!event) {
  return <NotFound />
}

if (prices.length === 0) {
  return <NoTicketsAvailable />
}
```

#### 风险点

- ⚠️ 活动数据迁移（硬编码 → 数据库）
- ⚠️ Slug 唯一性约束

#### 回滚方案

```bash
git revert <PR-4-commit>
# 恢复硬编码数据
```

#### 验收标准

- [ ] 活动详情页显示正确日期/时间
- [ ] 票价从数据库读取
- [ ] 没有价格时显示友好提示

---

### PR-5: 订单→出票→二维码（后端幂等 + 前端超时）

**目标:** 修复订单写入失败，添加前端重试逻辑

#### 改动文件清单

**修改:**
```
lib/ticket-service.js
  - 使用 field-mapper
  - 添加幂等检查
  - 修复字段映射
app/success/page.js
  - 添加 API 调用超时（30s）
  - 添加重试逻辑（最多3次）
  - 添加错误状态展示
```

#### 幂等逻辑

```typescript
// lib/ticket-service.js
async function processPaidOrder(sessionData) {
  // 1. 幂等检查
  const { data: existing } = await supabase
    .from('orders')
    .select('*, tickets(*)')
    .eq('stripe_session_id', sessionData.id) // ✅ 正确字段
    .single()

  if (existing) {
    console.log('[TicketService] Order exists, returning')
    return existing
  }

  // 2. 创建订单（使用 field-mapper）
  const orderData = mapOrderForInsert(sessionData)
  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) {
    console.error('[TicketService] Order creation failed:', error)
    throw new Error('Failed to create order')
  }

  // 3. 生成票据 + QR
  const tickets = await generateTickets(order, sessionData)
  return { ...order, tickets }
}
```

#### 前端超时与重试

```typescript
// app/success/page.js
const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error' | 'timeout'>('loading')

useEffect(() => {
  const fetchOrder = async (retries = 3) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s

      const res = await fetch(`/api/orders/by-session?session_id=${sessionId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets)
        setLoadingState('success')
      } else if (retries > 0) {
        setTimeout(() => fetchOrder(retries - 1), 5000) // 5s 后重试
      } else {
        setLoadingState('error')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setLoadingState('timeout')
      } else if (retries > 0) {
        setTimeout(() => fetchOrder(retries - 1), 5000)
      } else {
        setLoadingState('error')
      }
    }
  }

  fetchOrder()
}, [sessionId])
```

#### 渲染逻辑

```typescript
if (loadingState === 'loading') {
  return <Spinner message="Generating QR Code..." />
}

if (loadingState === 'timeout') {
  return <ErrorMessage message="QR generation is taking longer than usual. Please check your email." />
}

if (loadingState === 'error') {
  return <ErrorMessage message="Failed to load tickets. Please contact support." />
}

return tickets.map(ticket => <QRCode data={ticket.qr_payload} />)
```

#### 风险点

- ⚠️ 字段映射错误导致订单写入失败
- ⚠️ Webhook 重试可能导致重复订单

#### 回滚方案

```bash
git revert <PR-5-commit>
# 检查是否有重复订单需要清理
```

#### 验收标准

- [ ] 下单后订单写入数据库
- [ ] 成功页在30s内显示二维码
- [ ] 超时显示友好提示
- [ ] Webhook 重试不会创建重复订单

---

### PR-6: 健康检查端点与日志观测

**目标:** 添加监控与日志

#### 改动文件清单

**新建:**
```
app/api/health/route.js
app/api/health/db/route.js
lib/logger.ts
```

**修改:**
```
所有 API 路由（添加结构化日志）
  - app/api/auth/login/route.js
  - app/api/auth/register/route.js
  - app/api/orders/by-session/route.js
  - app/api/tickets/verify/route.js
  - lib/ticket-service.js
```

#### 健康检查端点

```typescript
// app/api/health/route.js
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NODE_ENV
  })
}

// app/api/health/db/route.js
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)

    if (error) throw error

    return Response.json({
      status: 'healthy',
      database: 'connected',
      tables_accessible: true
    })
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    }, { status: 500 })
  }
}
```

#### 结构化日志

```typescript
// lib/logger.ts
export const logApiCall = async (fn: string, data: any) => {
  const log = {
    fn,
    timestamp: new Date().toISOString(),
    duration_ms: data.duration,
    userId: data.userId,
    eventId: data.eventId,
    supabaseError: data.error?.code,
    requestId: data.requestId
  }

  console.log(JSON.stringify(log))
  // 可选: 发送到 Supabase Logs 或第三方服务
}
```

#### API 使用示例

```typescript
// app/api/auth/login/route.js
export async function POST(request) {
  const start = Date.now()
  
  try {
    // ... 业务逻辑
    
    const duration = Date.now() - start
    await logApiCall('auth/login', { duration, userId: user.id })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    const duration = Date.now() - start
    await logApiCall('auth/login', { duration, error })
    throw error
  }
}
```

#### 风险点

- ⚠️ 日志过多影响性能
- ⚠️ 敏感信息泄露

#### 回滚方案

```bash
git revert <PR-6-commit>
# 移除所有 logger 调用
```

#### 验收标准

- [ ] `/api/health` 返回 `{ status: 'ok' }`
- [ ] `/api/health/db` 检查数据库连接
- [ ] 所有 API 有日志输出
- [ ] 无敏感信息（密码/token）在日志中

---

## 📋 字段/关系/状态映射总表

### 字段映射（旧→新）

| 表 | 旧字段名 | 新字段名 | 影响文件 |
|----|---------|---------|----------|
| orders | `sessionId` | `stripe_session_id` | `lib/ticket-service.js:42,89` |
| orders | `email` | `customer_email` | `lib/ticket-service.js:89` |
| orders | `amount` | `total_amount_cents` | `lib/ticket-service.js:89` |
| orders | `paymentIntent` | `stripe_payment_intent` | `lib/ticket-service.js:89` |
| tickets | `issuedAt` | `created_at` | ✅ 一致 |
| tickets | `usedAt` | `used_at` | ✅ 一致 |
| events | `name` | `title` | `app/event/[slug]/page.js` |
| events | `location` | `venue_name` | `app/event/[slug]/page.js` |
| events | `startDate` | `start_at` | `app/event/[slug]/page.js` |

### 状态值映射

| 表 | 旧值 | 新值 | 说明 |
|----|------|------|------|
| events | `active` | `published` | 状态枚举 |
| events | `inactive` | `draft` | 状态枚举 |
| tickets | `unused` | `unused` | ✅ 一致 |
| tickets | `used` | `used` | ✅ 一致 |
| orders | `paid` | `paid` | ✅ 一致 |

---

## 🗂️ Slug/ID 策略建议

### 当前状态

- ❌ 活动使用硬编码 slug: `/event/ridiculous-chicken`
- ❌ 前端直接渲染，无 API 查询

### 建议方案

#### 选项 A: 使用 Slug（SEO 友好）

```sql
-- 添加唯一索引
CREATE UNIQUE INDEX idx_events_slug ON events(slug);

-- 查询
SELECT * FROM events WHERE slug = 'ridiculous-chicken'
```

**优点:** SEO 友好、易读  
**缺点:** 需要迁移现有数据

#### 选项 B: 使用 ID（简单直接）

```sql
-- 查询
SELECT * FROM events WHERE id = 'uuid-here'
```

**优点:** 无需迁移  
**缺点:** URL 不友好

### 推荐: 选项 A（Slug）

**实施步骤:**
1. 为 `events` 表添加 `slug` 字段
2. 迁移现有数据: `UPDATE events SET slug = 'ridiculous-chicken' WHERE title = 'Ridiculous Chicken'`
3. 创建唯一索引
4. 修改路由: `/event/[slug]`

---

## 📊 健康检查与日志方案

### 健康检查端点

| 端点 | 方法 | 返回结构 | 用途 |
|------|------|---------|------|
| `/api/health` | GET | `{ status: string, timestamp: string }` | 基本存活 |
| `/api/health/db` | GET | `{ status: string, database: string }` | 数据库连接 |
| `/api/health/events/:slug` | GET | `{ status: string, event: object }` | 事件可访问性 |

### 结构化日志字段

```typescript
interface LogEntry {
  fn: string                    // 函数名
  timestamp: string             // ISO 8601
  duration_ms: number          // 执行时间
  userId?: string              // 用户 ID
  eventId?: string             // 事件 ID
  supabaseError?: string       // Supabase 错误码
  requestId: string            // 请求 ID
  httpStatus?: number          // HTTP 状态码
}
```

### 日志输出示例

```json
{
  "fn": "auth/login",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration_ms": 245,
  "userId": "user-123",
  "httpStatus": 200,
  "requestId": "req-abc"
}
```

---

## ✅ 验收标准（本 PR-0）

### 文档完整性

- [x] AUDIT.md 包含所有证据（文件路径/行号/调用链）
- [x] PLAN.md 包含6个 PR 的详细方案
- [x] 不改代码、不创建文件以外的改动

### 影响面明确

- [x] 列出所有需要修改的文件（42+）
- [x] 列出所有需要删除的文件（10+）
- [x] 列出所有需要新建的文件（8+）
- [x] 明确每个 PR 的风险点与回滚方案

### 后续 PR 准备就绪

- [x] 字段映射表完整
- [x] RLS 策略脚本准备好（含回滚）
- [x] API 接口契约定义
- [x] 前端空态/错误处理方案
