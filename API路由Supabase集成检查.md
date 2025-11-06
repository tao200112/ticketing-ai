# 🔍 API 路由 Supabase 集成检查

**检查时间**: 2025-01-26  
**目的**: 确保所有 API 路由正确使用 Supabase

---

## ✅ 已集成 Supabase 的 API 路由

### 1. 用户认证相关

#### ✅ `/api/auth/register` - 用户注册
- **文件**: `app/api/auth/register/route.js`
- **使用表**: `users`
- **操作**: INSERT, SELECT
- **字段**: `email`, `password_hash`, `name`, `age`, `role`
- **状态**: ✅ 正常工作

#### ✅ `/api/auth/login` - 用户登录
- **文件**: `app/api/auth/login/route.js`
- **使用表**: `users`
- **操作**: SELECT
- **字段**: `email`, `password_hash`
- **状态**: ✅ 正常工作

---

### 2. 活动相关

#### ✅ `/api/events` - 获取活动列表
- **文件**: `app/api/events/route.js`
- **使用表**: `events`, `merchants`
- **操作**: SELECT (关联查询)
- **状态**: ✅ 正常工作

#### ✅ `/api/events/[id]` - 获取活动详情
- **文件**: `app/api/events/[id]/route.js`
- **使用表**: `events`, `merchants`, `prices`
- **操作**: SELECT (关联查询)
- **状态**: ✅ 正常工作

---

### 3. 管理员相关

#### ✅ `/api/admin/events` - 获取所有活动
- **文件**: `app/api/admin/events/route.js`
- **使用表**: `events`, `merchants`
- **操作**: SELECT
- **状态**: ✅ 已修复（之前返回空数组）

#### ⚠️ `/api/admin/stats` - 系统统计
- **文件**: `app/api/admin/stats/route.js`
- **使用表**: 无（返回占位符数据）
- **状态**: ⚠️ 需要添加 Supabase 查询

#### ⚠️ `/api/admin/merchants` - 商家列表
- **文件**: `app/api/admin/merchants/route.js`
- **使用表**: 无（返回空数组）
- **状态**: ⚠️ 需要添加 Supabase 查询

#### ⚠️ `/api/admin/customers` - 用户列表
- **文件**: `app/api/admin/customers/route.js`
- **使用表**: 无（返回空数组）
- **状态**: ⚠️ 需要添加 Supabase 查询

#### ⚠️ `/api/admin/tickets` - 票务列表
- **文件**: `app/api/admin/tickets/route.js`
- **使用表**: 无（返回空数组）
- **状态**: ⚠️ 需要添加 Supabase 查询

---

## 📊 集成状态汇总

| API 路由 | 状态 | Supabase | 表名 |
|---------|------|----------|------|
| POST /api/auth/register | ✅ | ✅ | users |
| POST /api/auth/login | ✅ | ✅ | users |
| GET /api/events | ✅ | ✅ | events, merchants |
| GET /api/events/[id] | ✅ | ✅ | events, merchants, prices |
| GET /api/admin/events | ✅ | ✅ | events, merchants |
| GET /api/admin/stats | ⚠️ | ❌ | - |
| GET /api/admin/merchants | ⚠️ | ❌ | - |
| GET /api/admin/customers | ⚠️ | ❌ | - |
| GET /api/admin/tickets | ⚠️ | ❌ | - |

---

## 🚨 需要修复的 API

### 优先级 1: 管理员统计数据

```javascript
// app/api/admin/stats/route.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, supabaseKey)

// 获取统计数据
const [
  { count: userCount },
  { count: merchantCount },
  { count: eventCount },
  { count: orderCount },
  { count: ticketCount }
] = await Promise.all([
  supabase.from('users').select('id', { count: 'exact' }),
  supabase.from('merchants').select('id', { count: 'exact' }),
  supabase.from('events').select('id', { count: 'exact' }),
  supabase.from('orders').select('id', { count: 'exact' }),
  supabase.from('tickets').select('id', { count: 'exact' })
])

return NextResponse.json({
  users: userCount,
  merchants: merchantCount,
  events: eventCount,
  orders: orderCount,
  tickets: ticketCount
})
```

### 优先级 2: 商家列表

```javascript
// app/api/admin/merchants/route.js
const { data: merchants } = await supabase
  .from('merchants')
  .select('*')
  .order('created_at', { ascending: false })

return NextResponse.json(merchants || [])
```

### 优先级 3: 用户列表

```javascript
// app/api/admin/customers/route.js
const { data: customers } = await supabase
  .from('users')
  .select('id, email, name, role, created_at')
  .order('created_at', { ascending: false })

return NextResponse.json(customers || [])
```

### 优先级 4: 票务列表

```javascript
// app/api/admin/tickets/route.js
const { data: tickets } = await supabase
  .from('tickets')
  .select(`
    *,
    orders (customer_email, customer_name),
    events (title)
  `)
  .order('created_at', { ascending: false })

return NextResponse.json(tickets || [])
```

---

## 🎯 下一步行动

1. ✅ 已验证：用户注册/登录、活动查询正常工作
2. ⏳ 待修复：管理员面板的所有数据查询 API
3. ⏳ 待测试：完整的功能流程测试

---

## 📝 注意事项

1. **密码字段**: 已确认使用 `password_hash` 而不是 `password`
2. **价格表**: 已确认使用 `prices` 而不是 `event_prices`
3. **字段映射**: 
   - 价格: `amount_cents` (分为单位)
   - 票种: `name` (不是 `tier_name`)
   - 库存: `inventory` (不是 `available_quantity`)








