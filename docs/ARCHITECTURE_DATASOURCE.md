# 架构数据源文档

> **唯一真源**: Supabase PostgreSQL  
> **最后更新**: PR-1

## 📊 数据源架构

### 单一数据源原则

本系统使用 **Supabase PostgreSQL** 作为唯一数据源，遵循以下原则：

1. ✅ **唯一数据库**: Supabase PostgreSQL（生产环境）
2. ❌ **无本地回退**: 不使用 Prisma/SQLite、localStorage 作为数据库
3. ❌ **无混合存储**: 不使用多个数据源并存

---

## 🔧 客户端实例架构

### 1. 浏览器端 (`lib/supabase-client.ts`)

**用途**: 客户端组件、浏览器 API 调用

**特征**:
- 使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 自动启用 RLS（Row Level Security）
- 基于浏览器 cookies 管理会话
- 自动刷新 token

**示例**:
```typescript
import { getSupabaseClient } from '@/lib/supabase-client'

const supabase = getSupabaseClient()
const { data } = await supabase.from('events').select('*')
```

---

### 2. 服务端 RLS 客户端 (`lib/supabase-server.ts`)

**用途**: Server Components、API Routes（需要 RLS 的场景）

**特征**:
- 使用 `createServerClient` 基于 cookies
- 遵守 RLS 策略
- 不暴露 Service Role Key
- 与会话用户绑定

**示例**:
```typescript
import { getSupabaseServer } from '@/lib/supabase-server'

const supabase = await getSupabaseServer()
const { data } = await supabase.from('orders').select('*') // 只返回该用户的订单
```

---

### 3. Service Role 客户端 (`lib/supabase-admin.ts`)

**用途**: 服务端 API Routes（需要绕过 RLS）

**特征**:
- 绕过所有 RLS 策略
- 仅在服务端使用（浏览器环境禁止）
- 仅用于：Webhook、后台管理、系统任务

**安全警告**:
- ⚠️ 仅在 API Routes 中使用
- ⚠️ 禁止在客户端组件中导入
- ⚠️ 禁止暴露 Service Role Key

**示例**:
```typescript
import { supabaseAdmin } from '@/lib/supabase-admin'

// ✅ 在 API Route 中使用
export async function POST(request: Request) {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('*') // 返回所有订单（绕过 RLS）
}
```

---

## 📁 数据访问层

### 统一接口 (`lib/db/index.ts`)

**原则**:
1. 统一使用 `lib/db/index.ts` 的接口
2. 不要直接调用 `supabase.from(...)`
3. 所有字段名使用数据库真实字段（snake_case）

**示例**:
```typescript
// ✅ 正确：使用数据访问层
import { getOrderByStripeSession } from '@/lib/db'

const order = await getOrderByStripeSession(sessionId)

// ❌ 错误：直接调用 Supabase
import { supabaseAdmin } from '@/lib/supabase-admin'
const order = await supabaseAdmin.from('orders').select('*')
```

### 类型定义 (`lib/db/types.ts`)

所有数据库类型定义在 `lib/db/types.ts` 中：

- `Event`, `EventWithPrices`
- `Order`, `OrderWithTickets`
- `Ticket`, `TicketWithOrder`
- `Price`
- `User`

---

## 🔐 环境变量

### 浏览器端（公开）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 服务端（私有）

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # 仅服务端使用
```

---

## 📋 何时使用哪个客户端？

| 场景 | 使用 | 原因 |
|-----|------|------|
| 客户端组件 | `lib/supabase-client.ts` | 需要 RLS，自动会话管理 |
| Server Components | `lib/supabase-server.ts` | 需要 RLS，服务端执行 |
| API Route（用户数据） | `lib/supabase-server.ts` | 需要 RLS 过滤 |
| API Route（Webhook） | `lib/supabase-admin.ts` | 绕过 RLS |
| API Route（管理） | `lib/supabase-admin.ts` | 绕过 RLS |
| 数据访问层 | `lib/db/index.ts` | 统一接口 |

---

## ❌ 已弃用

### Prisma/SQLite

- ❌ `lib/db.js`（Prisma 初始化）
- ❌ `prisma/schema.prisma`
- ❌ `prisma/migrations/`

**原因**: 未实际使用，造成技术债

### localStorage 作为数据库

- ❌ `lib/user-storage.js`
- ❌ 在 15+ 文件中的 localStorage 回退

**原因**: 不安全，数据易丢失

---

## 📚 相关文档

- [数据访问层接口签名](lib/db/index.ts)
- [类型定义](lib/db/types.ts)
- [Service Role 安全使用指南](docs/DEBUG_ROUTES_POLICY.md)
