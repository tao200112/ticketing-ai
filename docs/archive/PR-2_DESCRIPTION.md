# PR-2: 字段/关系/状态映射 & 数据访问层实现

## 📋 目标

本 PR 为数据层修复任务，**不改 UI 渲染逻辑**，仅进行字段映射与数据访问层实现：

1. ✅ 建立统一字段映射层（Stripe → Database）
2. ✅ 实现数据访问层核心函数
3. ✅ 修复订单写入/查询路径的字段映射
4. ✅ 保持前端响应结构不变

---

## 🔍 关键修复点

### A. 字段映射修复

#### 订单表字段映射

| 旧字段（代码中） | 新字段（数据库） | 位置 | 修复状态 |
|----------------|----------------|------|---------|
| `sessionId` | `stripe_session_id` | 所有查询/写入 | ✅ 已修复 |
| `email` | `customer_email` | 所有查询 | ✅ 已修复 |
| `amount` | `total_amount_cents` | 所有查询 | ✅ 已修复 |
| `paymentIntent` | `stripe_payment_intent` | 订单创建 | ✅ 已修复 |

**影响文件**:
- `lib/db/field-mapper.ts:14-28` - 字段映射函数
- `lib/db/index.ts:56-110` - 订单创建函数
- `lib/db/index.ts:144-190` - 订单查询函数

---

### B. 数据访问层实现

#### 已实现的函数

1. **`getOrderByStripeSession(sessionId)`**
   - 文件: `lib/db/index.ts:144-190`
   - 功能: 根据 Stripe Session ID 查询订单和票据
   - 返回: `OrderWithTicketsModel | null`

2. **`createOrderFromStripeSession(session)`**
   - 文件: `lib/db/index.ts:56-110`
   - 功能: 从 Stripe Session 创建订单
   - 包含: 幂等检查、字段验证、字段映射
   - 返回: `OrderModel`

3. **`getPublishedEventBySlug(slug)`**
   - 文件: `lib/db/index.ts:30-67`
   - 功能: 获取已发布的事件（包含价格）

4. **`listActivePrices(eventId)`**
   - 文件: `lib/db/index.ts:69-94`
   - 功能: 获取事件的活跃价格

---

### C. API 路由修复

#### 1. `/api/orders/by-session` 

**文件**: `app/api/orders/by-session/route.js`

**修改**:
```javascript
// 之前: 直接使用 supabaseAdmin
const { data: order, error } = await supabaseAdmin
  .from('orders')
  .select('*, tickets(*)')
  .eq('stripe_session_id', sessionId)
  .single();

// 之后: 使用数据访问层
const orderData = await getOrderByStripeSession(sessionId);
```

**字段映射**:
```javascript
// 修复字段名
sessionId: orderData.stripeSessionId,  // 之前: order.sessionId
email: orderData.customerEmail,        // 之前: order.email
amount: orderData.totalAmountCents,    // 之前: order.amount
```

---

#### 2. `/api/stripe/webhook`

**文件**: `app/api/stripe/webhook/route.js`

**修改**:
```javascript
// 之前: 使用 processPaidOrder (lib/ticket-service.js)
const result = await processPaidOrder(session);

// 之后: 使用数据访问层
const order = await createOrderFromStripeSession(session);
```

**日志记录**:
```javascript
console.log('[StripeWebhook] Order created successfully:', {
  orderId: order.id,
  stripeSessionId: order.stripeSessionId,
  customerEmail: order.customerEmail,
  totalAmountCents: order.totalAmountCents,
  eventId: order.eventId,
  tier: order.tier
});
```

**TODO**: 票据创建留到 PR-5

---

## 📊 类型定义（统一模型）

### OrderModel

```typescript
interface OrderModel {
  id: string
  stripeSessionId: string      // ✅ 修复：之前用 sessionId
  stripePaymentIntent: string | null
  customerEmail: string         // ✅ 修复：之前用 email
  eventId: string
  tier: string
  totalAmountCents: number      // ✅ 修复：之前用 amount
  currency: string
  status: 'paid' | 'pending' | 'failed'
  userId: string | null
  createdAt: string
  updatedAt: string
}
```

### TicketModel

```typescript
interface TicketModel {
  id: string
  shortId: string
  orderId: string
  eventId: string
  holderEmail: string           // ✅ 已一致
  tier: string
  priceCents: number
  status: 'unused' | 'used'
  qrPayload: string             // ✅ 已一致
  issuedAt: string
  usedAt: string | null
  createdAt: string
  updatedAt: string
}
```

---

## 📝 改动文件清单

### 新建文件

```
lib/db/field-mapper.ts            # 字段映射层
lib/db/types.ts                   # 统一类型定义（v2）
docs/FIELD_MAPPING_V2.md          # 字段映射文档
scripts/smoke-db.mjs              # 最小验证脚本
PR-2_DESCRIPTION.md               # 本文件
```

### 修改文件

```
lib/db/index.ts                   # 实现所有核心函数
lib/db/types.ts                   # 更新为统一模型
app/api/orders/by-session/route.js  # 使用数据访问层
app/api/stripe/webhook/route.js   # 使用数据访问层
```

---

## 🔒 安全验证

### Service Role 使用检查

运行 `npm run lint:debt` 输出：

```
🔐 Service Role Key usage: 6 occurrences

Files with Service Role Key usage:
  app/api/diag/production/route.ts
  configure-database.js
  quick-setup.js
  verify-database.js
  lib/db/index.ts                 # ✅ 仅在服务端使用
  lib/supabase-admin.ts
```

**结论**: ✅ Service Role 仅在服务端使用，未暴露到客户端

---

## 🧪 验证脚本

运行 `node scripts/smoke-db.mjs` 将执行：

1. 测试 `getOrderByStripeSession('nonexistent')` 返回 null
2. 测试 `createOrderFromStripeSession({id: 'test'})` 抛出字段缺失错误

---

## 🔄 回滚方案

### 回滚步骤

```bash
# 1. 回滚代码
git revert <PR-2-commit>

# 2. 恢复旧 API 路由
# 手动恢复 app/api/orders/by-session/route.js
# 手动恢复 app/api/stripe/webhook/route.js

# 3. 重新构建
npm run build
```

### 影响文件回滚清单

- `app/api/orders/by-session/route.js` - 恢复直接使用 supabaseAdmin
- `app/api/stripe/webhook/route.js` - 恢复使用 processPaidOrder

---

## ✅ 验收标准

- [x] `npm run build` 通过
- [x] 类型定义使用统一模型（camelCase）
- [x] 字段映射在数据访问层完成
- [x] `GET /api/orders/by-session?session_id=xxx` 返回正确结构
- [x] webhook 能创建订单（字段正确）
- [x] 客户端未打包 Service Role
- [x] 未改动页面 UI 行为

---

## 📊 映射表摘要

### 关键映射条目

| 表 | 旧字段 | 新字段 | 位置 |
|----|--------|--------|------|
| orders | `sessionId` | `stripe_session_id` | 所有查询/写入 |
| orders | `email` | `customer_email` | 所有查询 |
| orders | `amount` | `total_amount_cents` | 所有查询 |
| tickets | `short_id` | `shortId` (model) | 查询结果 |
| tickets | `qr_payload` | `qrPayload` (model) | 查询结果 |

详细映射表见 [docs/FIELD_MAPPING_V2.md](docs/FIELD_MAPPING_V2.md)

---

## 🔗 相关 PR

- **PR-1**: 统一数据源 & 关闭调试页 ✅
- **PR-3**: RLS/Policy 最小脚本
- **PR-4**: 活动详情页接入新数据层
- **PR-5**: 订单→出票→二维码完整流程

---

## ❌ 本 PR 不做的事

- ❌ 不改活动详情页 UI（留到 PR-4）
- ❌ 不改成功页加载逻辑（留到 PR-5）
- ❌ 不引入 localStorage 回退
- ❌ 不修改 RLS 策略（留到 PR-3）
- ❌ 不输出真实密钥
