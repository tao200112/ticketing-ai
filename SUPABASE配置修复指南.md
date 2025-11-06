# 🛠️ Supabase 配置修复指南

**日期**: 2025-01-26  
**问题**: 数据库表结构不匹配  
**状态**: ⚠️ 需要修复

---

## 🔍 问题诊断

### 当前数据库表结构

#### ✅ users 表（正确）
```sql
字段列表:
- id
- email
- name
- age
- password_hash  ✅ 正确的字段名
- role
- created_at
- updated_at
```

#### ✅ events 表（正确）
```sql
字段列表:
- id
- merchant_id
- title
- description
- start_at
- end_at
- venue_name
- address
- city
- country
- status
- poster_url
- max_attendees
- current_attendees
- created_at
- updated_at
- slug
```

#### ⚠️ prices 表（API 使用错误表名）
- 数据库表名: `prices`
- API 代码使用: `event_prices`
- 字段不匹配

---

## 🔧 需要修复的问题

### 1. API 表名错误
**文件**: `app/api/events/[id]/route.js`

**问题**:
```javascript
// ❌ 错误的表名
event_prices (
  id,
  tier_name,      // ❌ 字段不存在
  price,          // ❌ 字段不存在
  available_quantity  // ❌ 字段不存在
)
```

**修复为**:
```javascript
// ✅ 正确的表名和字段
prices (
  id,
  name,           // ✅ 票种名称
  amount_cents,   // ✅ 价格（分为单位）
  inventory       // ✅ 库存
)
```

### 2. 完整 prices 表字段
根据 `supabase/migrations/partytix_mvp.sql`:

```sql
CREATE TABLE prices (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name TEXT NOT NULL,              -- 票种名称
  description TEXT,
  amount_cents INTEGER NOT NULL,   -- 价格（分）
  currency TEXT DEFAULT 'USD',
  inventory INTEGER DEFAULT 0,     -- 库存
  sold_count INTEGER DEFAULT 0,    -- 已售数量
  limit_per_user INTEGER DEFAULT 4,
  tier_sort INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ 修复步骤

### 步骤 1: 修复 API 路由

**文件**: `app/api/events/[id]/route.js`

将 `event_prices` 改为 `prices`，并更新字段名。

### 步骤 2: 验证数据库表结构

运行以下命令检查是否所有必需的表都存在：

```bash
# 检查表是否存在
node check-table-structure.js
```

### 步骤 3: 更新其他使用 event_prices 的地方

搜索代码中所有使用 `event_prices` 的地方，确保改为 `prices`。

---

## 📊 表名映射表

| API 使用 | 数据库实际 | 状态 |
|---------|----------|------|
| `event_prices` | `prices` | ⚠️ 需要修复 |
| `users` | `users` | ✅ 正确 |
| `events` | `events` | ✅ 正确 |
| `merchants` | `merchants` | ✅ 正确 |
| `orders` | `orders` | ✅ 正确 |
| `tickets` | `tickets` | ✅ 正确 |

---

## 🎯 字段名映射表

| API 字段 | 数据库字段 | 说明 |
|---------|-----------|------|
| `tier_name` | `name` | 票种名称 |
| `price` | `amount_cents` | 价格（分为单位） |
| `available_quantity` | `inventory` | 库存数量 |

---

## 🚀 立即执行

### 已完成的修复
- ✅ 修复 `users` 表字段名 (`password` → `password_hash`)
- ✅ 修复 API 路由中的表名引用

### 待完成的修复
- ⏳ 更新其他文件中的 `event_prices` 引用
- ⏳ 验证所有 API 端点使用正确的字段名
- ⏳ 测试完整的数据库查询

---

## 📝 注意事项

1. **表名**: 数据库使用 `prices` 而不是 `event_prices`
2. **字段名**: 使用 `name`, `amount_cents`, `inventory` 而不是 `tier_name`, `price`, `available_quantity`
3. **关联查询**: 需要通过 `event_id` 关联 `prices` 表

---

## 🔗 相关文件

- SQL 迁移文件: `supabase/migrations/partytix_mvp.sql`
- API 路由: `app/api/events/[id]/route.js`
- 修复脚本: `check-table-structure.js`








