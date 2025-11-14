# RLS Policy 修复总结

## 问题描述

新账号买票后，My Tickets / My Orders 为空，Supabase 日志显示 GET /orders 返回 403。根本原因是 RLS policy 阻止了新账号读取 orders / tickets 表。

## 修复方案

统一使用 `supabase_uid` 作为唯一用户标识，删除所有基于邮箱、user_id、customer_id 的匹配逻辑。

## 修改的文件

### 1. 数据库迁移文件

**`supabase/migrations/fix_rls_policies_supabase_uid_only.sql`** (新增)
- 删除所有旧的 RLS policies
- 创建新的 policies，只使用 `supabase_uid = auth.uid()`
- 确保 RLS 已启用
- 包含验证脚本

### 2. 前端查询逻辑

**`app/account/page.js`** (修改)
- **修改前**：使用 `.or()` 查询，包含 `supabase_uid`、`user_id`、`holder_email` 的匹配
- **修改后**：只使用 `.eq('supabase_uid', supabaseUid)` 查询
- 添加详细的调试日志：
  - `🔍 Account Page - Auth UID: ...`
  - `🎫 Account Page - Tickets returned: X [...]`
  - `📦 Account Page - Orders returned: X [...]`
  - `👤 Account Page - Current User Info: {...}`

**`lib/ticket-service.js`** (修改)
- **修改前**：使用 `.or()` 查询，包含 `supabase_uid` 和 `user_id` 的匹配
- **修改后**：只使用 `.eq('supabase_uid', supabaseUid)` 查询
- 参数名从 `userId` 改为 `supabaseUid`，并添加必填验证

**`app/api/orders/by-session/route.js`** (修改)
- **修改前**：使用 `supabase_uid`、`user_id`、`holder_email` 的过滤逻辑
- **修改后**：只使用 `supabase_uid` 过滤
- 未登录用户返回空数组（RLS 会阻止访问）

## 新的 RLS Policies

### Orders 表

```sql
-- SELECT: 用户只能查看自己的订单
CREATE POLICY "Allow users to view own orders"
ON orders FOR SELECT
USING (auth.uid() = supabase_uid);

-- UPDATE: 用户可以更新自己的订单
CREATE POLICY "Allow users to update own orders"
ON orders FOR UPDATE
USING (auth.uid() = supabase_uid);
```

### Tickets 表

```sql
-- SELECT: 用户只能查看自己的票据
CREATE POLICY "Allow users to view own tickets"
ON tickets FOR SELECT
USING (auth.uid() = supabase_uid);
```

### 保持的 Policies

- `orders_insert_allow`: Service Role 可写入（用于 webhook）
- `tickets_insert_allow`: Service Role 可插入（用于出票服务）
- `tickets_update_merchant`: 商家可更新（用于核销）

## 替换后的前端查询代码

### Account 页面

```javascript
// 获取 Supabase Auth UID
const { data: { user: authUser } } = await client.auth.getUser()
const supabaseUid = authUser.id

// 查询 tickets（只使用 supabase_uid）
const { data: ticketsData } = await client
  .from('tickets')
  .select('*')
  .eq('supabase_uid', supabaseUid)
  .order('created_at', { ascending: false })

// 查询 orders（只使用 supabase_uid）
const { data: ordersData } = await client
  .from('orders')
  .select('*')
  .eq('supabase_uid', supabaseUid)
  .order('created_at', { ascending: false })
```

### Ticket Service

```javascript
export async function getUserTickets(supabaseUid) {
  if (!supabaseUid) {
    console.error('[TicketService] supabaseUid is required')
    return []
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('supabase_uid', supabaseUid)
    .order('created_at', { ascending: false })

  return tickets || []
}
```

## 验证步骤

### 1. 执行迁移文件

在 Supabase SQL Editor 中执行：
```sql
-- 运行迁移文件
\i supabase/migrations/fix_rls_policies_supabase_uid_only.sql
```

### 2. 验证 RLS 配置

```sql
-- 检查 RLS 是否启用
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets');

-- 检查 policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets')
ORDER BY tablename, policyname;
```

### 3. 测试新账号查询

```sql
-- 获取新账号的 Supabase UID（从 auth.users 表）
SELECT id, email FROM auth.users 
WHERE email = 'new_user@example.com';

-- 假设新账号 UID 为 'xxx-xxx-xxx'
-- 测试查询（使用 Service Role，绕过 RLS）
SELECT * FROM orders
WHERE supabase_uid = 'xxx-xxx-xxx';

SELECT * FROM tickets
WHERE supabase_uid = 'xxx-xxx-xxx';
```

### 4. 测试 RLS 是否生效

#### 测试 1: RLS disabled（应该能查到数据）
```sql
-- 临时禁用 RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 查询（应该能查到）
SELECT * FROM orders WHERE supabase_uid = 'xxx-xxx-xxx';
SELECT * FROM tickets WHERE supabase_uid = 'xxx-xxx-xxx';

-- 重新启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
```

#### 测试 2: RLS enabled with JWT（应该能查到自己的数据）
在浏览器中：
1. 使用新账号登录
2. 打开 Account 页面
3. 查看浏览器控制台日志：
   - `🔍 Account Page - Auth UID: xxx-xxx-xxx`
   - `🎫 Account Page - Tickets returned: X [...]`
   - `📦 Account Page - Orders returned: X [...]`
4. 确认能查到数据

#### 测试 3: 未授权 JWT（应该查不到数据）
使用不同的账号登录，应该查不到其他用户的数据。

### 5. 前端调试输出

在 Account 页面加载时，浏览器控制台应该显示：

```
🔍 Account Page - Auth UID: <supabase-uid>
🎫 Account Page - Tickets returned: <count> <array>
📦 Account Page - Orders returned: <count> <array>
👤 Account Page - Current User Info: {
  id: "...",
  email: "...",
  supabase_uid: "...",
  has_tickets: true/false,
  has_orders: true/false
}
```

## 注意事项

1. **必须确保所有订单和票务都有 `supabase_uid` 字段**
   - 新创建的订单/票务会自动写入 `supabase_uid`
   - 旧数据需要通过迁移脚本更新（`add_supabase_uid_to_orders_tickets.sql`）

2. **RLS 只允许通过 `supabase_uid` 访问**
   - 不再支持邮箱匹配
   - 不再支持 `user_id` 匹配
   - 如果 `supabase_uid` 为空，RLS 会阻止访问

3. **Service Role 绕过 RLS**
   - Webhook 和后台服务使用 Service Role Key，不受 RLS 限制
   - 前端使用 Anon Key，受 RLS 限制

4. **商家权限保持不变**
   - 商家仍然可以通过 `tickets_update_merchant` policy 更新票据（用于核销）

## 回滚方案

如果需要回滚到旧的 RLS policies：

```sql
-- 删除新 policies
DROP POLICY IF EXISTS "Allow users to view own orders" ON orders;
DROP POLICY IF EXISTS "Allow users to update own orders" ON orders;
DROP POLICY IF EXISTS "Allow users to view own tickets" ON tickets;

-- 恢复旧 policies（使用邮箱匹配）
CREATE POLICY "orders_select_own_by_email"
  ON orders FOR SELECT
  USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "tickets_select_own_by_email"
  ON tickets FOR SELECT
  USING (
    holder_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

## 相关文件

- `supabase/migrations/fix_rls_policies_supabase_uid_only.sql` - 新的 RLS policies
- `supabase/migrations/add_supabase_uid_to_orders_tickets.sql` - 添加 supabase_uid 字段
- `app/account/page.js` - Account 页面查询逻辑
- `lib/ticket-service.js` - Ticket Service 查询逻辑
- `app/api/orders/by-session/route.js` - Orders API 查询逻辑

