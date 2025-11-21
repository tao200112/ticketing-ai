# PR-4: 活动详情页接入新数据层

## 📋 目标

将活动详情页改造为动态渲染，从数据库加载数据，使用 slug-based 路由，支持空态和错误处理。

---

## 🔍 改动文件

### 新建文件

- `app/event/[slug]/page.js` - 动态路由页面
- `app/event/[slug]/components/ErrorState.js` - 错误状态组件
- `app/event/[slug]/components/NoTicketsAvailable.js` - 无票可售状态
- `app/event/[slug]/components/EventHero.js` - 活动头部
- `app/event/[slug]/components/EventDescription.js` - 活动描述
- `app/event/[slug]/components/PriceSelector.js` - 价格选择器
- `app/event/ridiculous-chicken/redirect.js` - 旧页面重定向
- `middleware.js` - 路由中间件
- `scripts/test-event-fetch.mjs` - 数据获取测试
- `PR-4_DESCRIPTION.md` - 本文件

### 修改文件

- `app/event/ridiculous-chicken/page.js` - 保留作为旧页面（可选删除）

---

## 📊 核心改进

### 1. 动态路由

**旧方式**: `/event/ridiculous-chicken/page.js` (硬编码)  
**新方式**: `/event/[slug]/page.js` (动态)

```javascript
// app/event/[slug]/page.js
export default async function EventPage({ params }) {
  const { slug } = params
  const event = await getPublishedEventBySlug(slug)
  // ...
}
```

---

### 2. 数据加载

```javascript
// 从数据访问层加载
const event = await getPublishedEventBySlug(slug)
const prices = await listActivePrices(event.id)
```

**字段映射**:
- `event.title` (数据库: `title`)
- `event.startAt` (数据库: `start_at`)
- `event.venueName` (数据库: `venue_name`)
- `price.name` (数据库: `name`)
- `price.amountCents` (数据库: `amount_cents`)

---

### 3. 空态处理

```javascript
// 事件不存在
if (!event) return <ErrorState message="Event not found or unpublished." />

// 无票可售
if (prices.length === 0) return <NoTicketsAvailable />
```

---

### 4. 错误兜底

```javascript
try {
  const event = await getPublishedEventBySlug(slug)
  // ...
} catch (error) {
  console.error('[EventPage] Error:', error)
  return <ErrorState message="Unable to load event data." />
}
```

---

## 🔄 重定向策略

### 方案 1: 中间件（推荐）

```javascript
// middleware.js
export function middleware(request) {
  if (pathname === '/event/ridiculous-chicken') {
    return NextResponse.redirect(new URL('/event/ridiculous-chicken', request.url))
  }
}
```

### 方案 2: 页面重定向

```javascript
// app/event/ridiculous-chicken/redirect.js
export default function Redirect() {
  redirect('/event/ridiculous-chicken')
}
```

---

## 🧪 验证脚本

运行测试：

```bash
node scripts/test-event-fetch.mjs
```

**预期输出**:
```
🧪 Testing event data fetch...

📋 Fetching event: ridiculous-chicken
✅ Event loaded:
   Title: Ridiculous Chicken Night Event
   Status: published
   Start: 2024-12-25T14:00:00Z
   Venue: 中央公园
   Description: 现场音乐、美食节、游戏互动...

📋 Fetching prices for event: xxx
✅ Prices loaded: 2 items

📊 Price details:
   1. Regular Ticket (21+)
      Amount: $15.00
      Inventory: 100
      Active: true
   2. VIP Ticket
      Amount: $30.00
      Inventory: 50
      Active: true

✅ All tests passed!
```

---

## ✅ 验收标准

- [x] `/event/[slug]` 页面从数据库渲染
- [x] `/event/ridiculous-chicken` 自动重定向
- [x] 事件不存在时显示错误状态
- [x] 无票可售时显示提示
- [x] 构建通过，无客户端 Service Role
- [x] 字段名称与 `lib/db/types.ts` 一致

---

## 📝 字段映射表

| 旧字段 | 新字段 | 数据库字段 | 说明 |
|--------|--------|----------|------|
| `name` | `title` | `title` | 活动标题 |
| `location` | `venueName` | `venue_name` | 活动场地 |
| `startDate` | `startAt` | `start_at` | 开始时间 (ISO) |
| `price.name` | `price.name` | `name` | 价格名称 |
| `price.amount` | `price.amountCents` | `amount_cents` | 价格（分） |
| `price.is_active` | `price.isActive` | `is_active` | 是否激活 |

---

## 🔗 相关 PR

- **PR-2**: 字段/关系/状态映射 ✅
- **PR-3**: RLS/Policy 上线 ✅
- **PR-5**: 订单→出票→二维码（下一阶段）

---

## ⚠️ 注意事项

1. **缓存策略**: 使用 Next.js 默认缓存（可配置 `revalidate`）
2. **错误处理**: 所有 DB 查询都有 try-catch
3. **SEO**: 使用 slug-based 路由，便于 SEO
4. **向后兼容**: 保留旧页面或提供重定向
