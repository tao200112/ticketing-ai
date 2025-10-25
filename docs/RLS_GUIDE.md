# RLS 策略指南

> PR-3: Row-Level Security 执行、回滚与验证手册  
> 更新时间: 2024年10月

## 📋 概述

本指南涵盖 RLS 策略的：
- 执行步骤
- 回滚操作
- 验证测试
- 故障排除

---

## 🚀 执行步骤

### 前置条件

1. 确认数据库 schema 已创建（`supabase/migrations/partytix_mvp.sql`）
2. 确认 Supabase Auth 已启用
3. 准备 Service Role Key（仅供验证脚本）

### 执行 RLS 脚本

```bash
# 在 Supabase SQL Editor 中执行
# 或使用 psql

psql $DATABASE_URL -f supabase/migrations/20251025_rls_enable.sql
```

**预期输出**:
- `BEGIN` → `COMMIT`
- 无错误信息

---

## 🔄 回滚步骤

如果遇到问题需要回滚：

```bash
# 在 Supabase SQL Editor 中执行回滚脚本

psql $DATABASE_URL -f supabase/migrations/20251025_rls_disable_rollback.sql
```

**预期结果**:
- 所有策略被删除
- RLS 被禁用
- 视图被删除
- 数据不受影响

---

## ✅ 验证测试

### 1. 匿名用户测试

#### 测试 A：查询已发布的活动

```sql
-- 使用 anon key 查询
-- 预期：返回 status='published' 的活动

SELECT id, title, status 
FROM events 
WHERE status = 'published' 
LIMIT 5;
```

**预期结果**: ✅ 返回公开活动列表

---

#### 测试 B：查询活跃价格

```sql
-- 预期：仅返回 is_active=TRUE 且所属活动为 published 的价格

SELECT p.id, p.name, p.amount_cents, e.title as event_title
FROM prices p
JOIN events e ON p.event_id = e.id
WHERE p.is_active = TRUE
  AND e.status = 'published';
```

**预期结果**: ✅ 返回活跃价格

---

#### 测试 C：查询订单（应被拒绝）

```sql
-- 匿名用户尝试查询订单
SELECT * FROM orders LIMIT 1;
```

**预期结果**: ❌ 返回空结果集（策略拒绝）

---

### 2. 登录用户测试

#### 测试 D：查询自己的订单

```sql
-- 使用登录用户的 token
-- 前置条件：用户已存在且 email 匹配
-- 
-- 步骤：
-- 1. 登录获取 access_token
-- 2. 在请求头添加: Authorization: Bearer <access_token>
-- 3. 执行查询

SELECT * FROM orders 
WHERE customer_email = '<用户邮箱>';
```

**预期结果**: ✅ 返回该用户的订单

---

#### 测试 E：查询自己的票据

```sql
-- 使用登录用户的 token

SELECT * FROM tickets 
WHERE holder_email = '<用户邮箱>';
```

**预期结果**: ✅ 返回该用户的票据

---

#### 测试 F：尝试查询他人订单（应被拒绝）

```sql
-- 使用用户 A 的 token 查询用户 B 的订单
SELECT * FROM orders 
WHERE customer_email = '<用户B的邮箱>';
```

**预期结果**: ❌ 返回空结果集

---

### 3. 商家用户测试

#### 测试 G：商家管理自己的活动

```sql
-- 使用商家用户 token
-- 前置条件：merchants.owner_user_id = auth.uid()

-- 查询自己的活动
SELECT * FROM events 
WHERE merchant_id IN (
  SELECT id FROM merchants WHERE owner_user_id = auth.uid()
);

-- 更新自己的活动
UPDATE events 
SET title = 'Updated Title' 
WHERE merchant_id IN (
  SELECT id FROM merchants WHERE owner_user_id = auth.uid()
) 
AND id = '<活动ID>';
```

**预期结果**: ✅ 成功查询和更新

---

#### 测试 H：尝试修改他人活动（应被拒绝）

```sql
-- 商家 A 尝试修改商家 B 的活动
UPDATE events 
SET title = 'Hacked' 
WHERE merchant_id NOT IN (
  SELECT id FROM merchants WHERE owner_user_id = auth.uid()
)
LIMIT 1;
```

**预期结果**: ❌ 0 行受影响（策略拒绝）

---

### 4. Service Role 测试

#### 测试 I：Service Role 绕过所有策略

```javascript
// 使用 Node.js 脚本
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ 仅服务端使用
)

// 应能查询所有订单（不受策略限制）
const { data, error } = await supabase
  .from('orders')
  .select('*')

console.log('Service Role 查询结果:', data.length, '条记录')
```

**预期结果**: ✅ 返回所有订单（Service Role 绕过 RLS）

---

## 🔍 故障排除

### 问题 1: "permission denied for table events"

**原因**: RLS 已启用但策略未正确创建

**解决方案**:
```sql
-- 检查策略是否存在
SELECT * FROM pg_policies WHERE tablename = 'events';

-- 如果策略不存在，重新运行启用脚本
```

---

### 问题 2: Service Role 查询仍被拒绝

**原因**: 使用了错误的客户端实例

**检查**:
```javascript
// ❌ 错误：使用 anon key
const supabase = createClient(url, anonKey)

// ✅ 正确：使用 service role key
const supabase = createClient(url, serviceRoleKey)
```

---

### 问题 3: 用户无法查询自己的订单

**原因**: `customer_email` 与 `users.email` 不匹配

**检查**:
```sql
-- 验证用户信息
SELECT 
  auth.uid() as current_user_id,
  u.email as user_email
FROM users u 
WHERE u.id = auth.uid();

-- 验证订单邮箱
SELECT customer_email FROM orders LIMIT 5;

-- 确保 customer_email 匹配 users.email
```

---

## 📊 策略摘要

| 表 | SELECT | INSERT | UPDATE | DELETE |
|----|--------|--------|--------|--------|
| **events** | 已发布活动 | 商家自有 | 商家自有 | 商家自有 |
| **prices** | 活跃价格 | 商家自有 | 商家自有 | 商家自有 |
| **orders** | 本人 | 允许（服务端） | 本人 | - |
| **tickets** | 本人 | 允许（服务端） | 商家/服务端 | - |
| **merchants** | 自有 | 自有 | 自有 | 自有 |

---

## ⚠️ 风险点

### 1. 身份映射

**当前实现**: 使用 `customer_email = users.email` 关联

**未来迁移**: 如果迁移到 Supabase Auth，需调整策略：
```sql
-- 新策略（迁移后）
USING (
  user_id = auth.uid()  -- 直接使用 auth.uid()
)
```

---

### 2. Service Role 保护

**关键**: Service Role Key 绝不能暴露到客户端

**检查方式**: 运行 `npm run lint:debt`，确认无 Service Role 引用

---

## 📚 相关文档

- [RLS 启用脚本](../supabase/migrations/20251025_rls_enable.sql)
- [RLS 回滚脚本](../supabase/migrations/20251025_rls_disable_rollback.sql)
- [PR-3 描述](../PR-3_DESCRIPTION.md)

---

## 🧪 自动化验证

运行验证脚本（可选）:

```bash
# 需要配置 .env.local 中的 Supabase 凭据
node scripts/verify-rls-anon.mjs
node scripts/verify-rls-auth.mjs
```

详见 `scripts/verify-rls-*.mjs` 源码。
