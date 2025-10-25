# 字段与关系映射表 v2

> 统一数据模型映射规则  
> 最后更新: PR-2

## 📋 总则

- 数据库字段名使用 **snake_case**
- TypeScript 类型使用 **camelCase**（与数据库字段名通过映射层转换）
- 所有字段映射在 `lib/db/field-mapper.ts` 中统一管理

---

## 📦 订单 (orders)

### 字段映射（Stripe → Database）

| Stripe 字段 | 数据库字段 | 类型 | 说明 |
|------------|-----------|------|------|
| `session.id` | `stripe_session_id` | TEXT | Stripe Session ID |
| `session.payment_intent` | `stripe_payment_intent` | TEXT | Payment Intent ID |
| `session.customer_email` | `customer_email` | TEXT | 客户邮箱 |
| `session.metadata.event_id` | `event_id` | TEXT | 活动 ID |
| `session.metadata.tier` | `tier` | TEXT | 票种 |
| `session.amount_total` | `total_amount_cents` | INTEGER | 总金额（分） |
| `session.currency` | `currency` | TEXT | 货币代码 |
| — | `status` | TEXT | 订单状态（'paid'/'pending'/'failed'） |

### ❌ 旧字段（已废弃）

- ~~`sessionId`~~ → `stripe_session_id`
- ~~`email`~~ → `customer_email`
- ~~`amount`~~ → `total_amount_cents`
- ~~`paymentIntent`~~ → `stripe_payment_intent`

### 影响文件

- `lib/db/field-mapper.ts:14` - 映射函数
- `lib/ticket-service.js:89` - 旧代码（需要修复）
- `app/api/stripe/webhook/route.js` - Webhook 处理

---

## 🎫 票据 (tickets)

### 字段映射

| 代码字段 | 数据库字段 | 类型 | 说明 |
|---------|-----------|------|------|
| `short_id` | `short_id` | TEXT | 8 位可读 ID |
| `order_id` | `order_id` | TEXT | 订单 ID |
| `event_id` | `event_id` | TEXT | 活动 ID |
| `holder_email` | `holder_email` | TEXT | 持票人邮箱 |
| `qr_payload` | `qr_payload` | TEXT | 二维码载荷 |
| `status` | `status` | TEXT | 状态（'unused'/'used'） |
| `created_at` | `created_at` | TIMESTAMP | 创建时间 |
| `used_at` | `used_at` | TIMESTAMP | 使用时间 |

### ✅ 已一致字段

- `holder_email`、`qr_payload`、`created_at`、`used_at` 均已正确

### 影响文件

- `lib/ticket-service.js:158-185` - 票据创建
- `app/api/tickets/verify/route.js` - 票据验证

---

## 📅 事件 (events)

### 字段映射

| 代码字段 | 数据库字段 | 类型 | 说明 |
|---------|-----------|------|------|
| `title` | `title` | TEXT | 活动标题 |
| `description` | `description` | TEXT | 活动描述 |
| `start_at` | `start_at` | TIMESTAMP | 开始时间 |
| `end_at` | `end_at` | TIMESTAMP | 结束时间 |
| `venue_name` | `venue_name` | TEXT | 场馆名称 |
| `address` | `address` | TEXT | 地址 |
| `status` | `status` | TEXT | 状态（'published'/'draft'） |

### ❌ 旧字段（已废弃）

- ~~`name`~~ → `title`
- ~~`location`~~ → `venue_name`
- ~~`startDate`~~ → `start_at`
- ~~`active`~~ → `status='published'`

### 影响文件

- `app/event/ridiculous-chicken/page.js:44` - 硬编码数据（PR-4 修复）
- `lib/db/index.ts` - 事件查询接口

---

## 💰 价格 (prices)

### 字段映射

| 代码字段 | 数据库字段 | 类型 | 说明 |
|---------|-----------|------|------|
| `name` | `name` | TEXT | 价格名称 |
| `amount_cents` | `amount_cents` | INTEGER | 金额（分） |
| `currency` | `currency` | TEXT | 货币代码 |
| `inventory` | `inventory` | INTEGER | 库存 |
| `sold_count` | `sold_count` | INTEGER | 已售数量 |
| `is_active` | `is_active` | BOOLEAN | 是否激活 |
| `valid_from` | `valid_from` | TIMESTAMP | 有效期开始 |
| `valid_to` | `valid_to` | TIMESTAMP | 有效期结束 |

### ❌ 旧字段（已废弃）

- ~~`label`~~ → `name`
- ~~`price`~~ → `amount_cents`
- ~~`active`~~ → `is_active`

### 影响文件

- `app/event/ridiculous-chicken/page.js:44` - 硬编码价格（PR-4 修复）

---

## 🔗 关系映射

### 一对多关系

- `events` → `prices` (event_id)
- `orders` → `tickets` (order_id)
- `events` → `tickets` (event_id)

### 外键命名

所有外键统一使用 `{table}_id` 格式：
- `event_id`
- `order_id`
- `merchant_id`
- `user_id`

---

## ⚠️ 注意事项

1. **所有字段映射必须在数据访问层完成**，调用方不应关心数据库字段名
2. **类型安全**：使用 TypeScript 类型确保字段一致性
3. **失败即停**：字段缺失或类型错误立即抛出错误
4. **不暴露原始字段**：数据访问层返回统一模型，不透出数据库原生字段

---

## 📚 相关文档

- [架构数据源文档](ARCHITECTURE_DATASOURCE.md)
- [类型定义](lib/db/types.ts)
- [字段映射实现](lib/db/field-mapper.ts)
