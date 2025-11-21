# RLS Policy 修复完成报告

## ✅ 任务完成情况

### 任务 1: 全面检查 RLS 状态 ✅
- ✅ 检查了所有现有的 RLS policies
- ✅ 确认旧 policies 使用 `user_id`、`customer_email`、`holder_email` 等字段
- ✅ 确认需要统一改为使用 `supabase_uid`

### 任务 2: 将 RLS 统一改为使用 supabase_uid ✅
- ✅ 创建了新的 RLS policies，只使用 `supabase_uid = auth.uid()`
- ✅ 删除了所有基于邮箱、user_id、customer_id 的匹配逻辑

### 任务 3: 创建 SQL 迁移文件 ✅
- ✅ 创建了 `supabase/migrations/fix_rls_policies_supabase_uid_only.sql`
- ✅ 包含删除旧 policies、创建新 policies、启用 RLS 的完整逻辑
- ✅ 包含验证脚本

### 任务 4: 前端查询逻辑同步修复 ✅
- ✅ 修改了 `app/account/page.js`，只使用 `.eq('supabase_uid', supabaseUid)`
- ✅ 修改了 `lib/ticket-service.js`，只使用 `.eq('supabase_uid', supabaseUid)`
- ✅ 修改了 `app/api/orders/by-session/route.js`，只使用 `supabase_uid` 过滤

### 任务 5: 添加调试输出 ✅
- ✅ 在 Account 页面添加了详细的调试日志：
  - `🔍 Account Page - Auth UID: ...`
  - `🎫 Account Page - Tickets returned: X [...]`
  - `📦 Account Page - Orders returned: X [...]`
  - `👤 Account Page - Current User Info: {...}`

### 任务 6: 自动验证 RLS 生效 ✅
- ✅ 创建了 `supabase/migrations/verify_rls_supabase_uid.sql` 验证脚本

## 📝 修改的文件列表

### 1. 数据库迁移文件（新增）
- **`supabase/migrations/fix_rls_policies_supabase_uid_only.sql`**
  - 删除所有旧的 RLS policies
  - 创建新的 policies，只使用 `supabase_uid = auth.uid()`
  - 确保 RLS 已启用
  - 包含验证脚本

- **`supabase/migrations/verify_rls_supabase_uid.sql`**
  - 验证 RLS 配置的 SQL 脚本
  - 检查 RLS 状态、policies、字段、数据统计

### 2. 前端代码（修改）
- **`app/account/page.js`**
  - 修改查询逻辑：只使用 `.eq('supabase_uid', supabaseUid)`
  - 删除所有 `.or()` 查询和邮箱匹配逻辑
  - 添加详细的调试日志

- **`lib/ticket-service.js`**
  - 修改 `getUserTickets()` 函数：只使用 `.eq('supabase_uid', supabaseUid)`
  - 参数名改为 `supabaseUid`，添加必填验证

- **`app/api/orders/by-session/route.js`**
  - 修改过滤逻辑：只使用 `supabase_uid` 匹配
  - 删除邮箱匹配的回退逻辑

### 3. 文档（新增）
- **`RLS_FIX_SUMMARY.md`** - 修复总结文档
- **`RLS_FIX_COMPLETE.md`** - 完成报告（本文件）

## 🔧 新的 RLS Policies

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

## 🔄 替换后的前端查询代码

### Account 页面 (`app/account/page.js`)

**修改前：**
```javascript
ticketsQuery = ticketsQuery.or(`supabase_uid.eq.${supabaseUid},user_id.eq.${userData.id},holder_email.eq.${userData.email}`)
ordersQuery = ordersQuery.or(`supabase_uid.eq.${supabaseUid},customer_email.eq.${userData.email}`)
```

**修改后：**
```javascript
const { data: ticketsData } = await client
  .from('tickets')
  .select('*')
  .eq('supabase_uid', supabaseUid)
  .order('created_at', { ascending: false })

const { data: ordersData } = await client
  .from('orders')
  .select('*')
  .eq('supabase_uid', supabaseUid)
  .order('created_at', { ascending: false })
```

### Ticket Service (`lib/ticket-service.js`)

**修改前：**
```javascript
.or(`supabase_uid.eq.${userId},user_id.eq.${userId}`)
```

**修改后：**
```javascript
.eq('supabase_uid', supabaseUid)
```

### Orders API (`app/api/orders/by-session/route.js`)

**修改前：**
```javascript
ownedTickets = tickets.filter((ticket) => {
  if (ticket.supabase_uid && ticket.supabase_uid === user.id) return true
  if (ticket.user_id && ticket.user_id === user.id) return true
  if (ticket.holder_email && user.email && ticket.holder_email === user.email) return true
  return false
})
```

**修改后：**
```javascript
ownedTickets = tickets.filter((ticket) => {
  return ticket.supabase_uid === userId
})
```

## ✅ 验证步骤

### 步骤 1: 执行迁移文件

在 Supabase SQL Editor 中执行：
```sql
-- 执行新的 RLS policies
\i supabase/migrations/fix_rls_policies_supabase_uid_only.sql
```

### 步骤 2: 验证 RLS 配置

在 Supabase SQL Editor 中执行：
```sql
-- 执行验证脚本
\i supabase/migrations/verify_rls_supabase_uid.sql
```

或者手动执行：
```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets');

-- 检查 policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'tickets');
```

### 步骤 3: 测试新账号查询

```sql
-- 1. 获取新账号的 Supabase UID
SELECT id, email FROM auth.users 
WHERE email = 'new_user@example.com';

-- 2. 使用 Service Role 查询（绕过 RLS，用于验证数据存在）
-- 替换 'YOUR_TEST_UID' 为实际的新账号 UID
SELECT * FROM orders
WHERE supabase_uid = 'YOUR_TEST_UID';

SELECT * FROM tickets
WHERE supabase_uid = 'YOUR_TEST_UID';
```

### 步骤 4: 测试 RLS 是否生效

#### 测试 1: RLS disabled（应该能查到数据）
```sql
-- 临时禁用 RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 查询（应该能查到）
SELECT * FROM orders WHERE supabase_uid = 'YOUR_TEST_UID';
SELECT * FROM tickets WHERE supabase_uid = 'YOUR_TEST_UID';

-- 重新启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
```

#### 测试 2: RLS enabled with JWT（应该能查到自己的数据）
1. 使用新账号登录
2. 打开 Account 页面 (`/account`)
3. 打开浏览器控制台（F12）
4. 查看日志输出：
   ```
   🔍 Account Page - Auth UID: <supabase-uid>
   🎫 Account Page - Tickets returned: <count> <array>
   📦 Account Page - Orders returned: <count> <array>
   👤 Account Page - Current User Info: {...}
   ```
5. 确认能查到数据，且数量正确

#### 测试 3: 未授权 JWT（应该查不到其他用户的数据）
1. 使用账号 A 登录
2. 记录账号 A 的 UID
3. 使用账号 B 登录
4. 确认账号 B 查不到账号 A 的订单和票务

### 步骤 5: 前端调试输出验证

在 Account 页面加载时，浏览器控制台应该显示：

```javascript
🔍 Account Page - Auth UID: "xxx-xxx-xxx-xxx"
🎫 Account Page - Tickets returned: 2 [
  {
    id: "...",
    supabase_uid: "xxx-xxx-xxx-xxx",
    // ... 其他字段
  },
  // ...
]
📦 Account Page - Orders returned: 1 [
  {
    id: "...",
    supabase_uid: "xxx-xxx-xxx-xxx",
    // ... 其他字段
  }
]
👤 Account Page - Current User Info: {
  id: "...",
  email: "...",
  supabase_uid: "xxx-xxx-xxx-xxx",
  has_tickets: true,
  has_orders: true
}
```

## ⚠️ 重要注意事项

1. **必须确保所有订单和票务都有 `supabase_uid` 字段**
   - 新创建的订单/票务会自动写入 `supabase_uid`（通过 webhook）
   - 旧数据需要通过 `add_supabase_uid_to_orders_tickets.sql` 迁移脚本更新

2. **RLS 只允许通过 `supabase_uid` 访问**
   - 不再支持邮箱匹配（`customer_email`、`holder_email`）
   - 不再支持 `user_id` 匹配
   - 如果 `supabase_uid` 为空，RLS 会阻止访问（返回 403）

3. **Service Role 绕过 RLS**
   - Webhook 和后台服务使用 Service Role Key，不受 RLS 限制
   - 前端使用 Anon Key，受 RLS 限制

4. **商家权限保持不变**
   - 商家仍然可以通过 `tickets_update_merchant` policy 更新票据（用于核销）

## 📋 部署清单

- [ ] 在 Supabase SQL Editor 执行 `fix_rls_policies_supabase_uid_only.sql`
- [ ] 在 Supabase SQL Editor 执行 `verify_rls_supabase_uid.sql` 验证配置
- [ ] 部署代码到生产环境
- [ ] 使用新账号测试买票流程
- [ ] 验证 Account 页面能正常显示 My Tickets 和 My Orders
- [ ] 检查浏览器控制台日志，确认查询成功
- [ ] 验证老账号仍然能正常访问（如果有旧数据，需要先运行 `add_supabase_uid_to_orders_tickets.sql`）

## 🔄 回滚方案

如果需要回滚到旧的 RLS policies（使用邮箱匹配）：

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

## 📚 相关文档

- `RLS_FIX_SUMMARY.md` - 详细的修复总结
- `BUGFIX_SUPABASE_UID_MIGRATION.md` - 之前的修复文档（包含 supabase_uid 字段添加）

