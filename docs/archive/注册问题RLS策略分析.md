# 注册问题 RLS 策略分析

## 当前策略状态

根据您提供的策略列表，当前有以下策略：

1. **Allow authenticated users to read users** - SELECT, 允许认证用户读取所有用户
2. **Allow public registration** - INSERT, 允许公开注册（with_check: true）
3. **Allow service role to manage users** - ALL, 允许服务角色管理用户
4. **Bypass RLS for trigger and service role** - ALL, USING (true) WITH CHECK (true) ✅
5. **Users can update own profile** - UPDATE, 用户可以更新自己的资料
6. **Users can update their own data** - UPDATE, 用户可以更新自己的数据（重复）
7. **Users can view own profile** - SELECT, 用户可以查看自己的资料（重复）
8. **Users can view their own data** - SELECT, 用户可以查看自己的数据（重复）

## 问题分析

### 1. 策略重复
- 有两个 SELECT 策略允许用户查看自己的数据
- 有两个 UPDATE 策略允许用户更新自己的数据
- 这可能导致混淆，但不应该阻止触发器插入

### 2. 关键策略分析

**"Bypass RLS for trigger and service role"** 策略：
- `USING (true)` - 允许所有读取操作
- `WITH CHECK (true)` - 允许所有写入操作
- 这个策略应该允许触发器插入数据

**"Allow public registration"** 策略：
- `INSERT` 操作
- `with_check: true` - 允许任何插入
- 这个策略也应该允许插入

### 3. 可能的问题

1. **策略冲突**：虽然理论上不应该，但多个策略可能会产生冲突
2. **触发器上下文**：触发器函数执行时的上下文可能不同
3. **Supabase 特定行为**：Supabase 可能对 RLS 策略有特殊处理

## 解决方案

### 方案 1: 清理并重新创建策略（推荐）

执行 `cleanup_and_fix_rls.sql` 脚本：

1. **删除所有现有策略**
2. **创建简化的策略集**：
   - "Bypass RLS for trigger and service role" - 允许所有操作（用于触发器）
   - "Allow service role to manage users" - 允许服务角色管理用户
   - "Users can view their own data" - 允许用户查看自己的数据
   - "Users can update their own data" - 允许用户更新自己的数据

3. **测试插入操作**

### 方案 2: 检查触发器函数

即使 RLS 策略正确，触发器函数本身可能有问题：

1. **检查触发器函数是否存在**
2. **检查触发器是否已创建**
3. **检查函数是否有正确的权限**

### 方案 3: 临时禁用 RLS（仅用于测试）

如果问题仍然存在，可以临时禁用 RLS 来测试：

```sql
-- 临时禁用 RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 测试注册
-- 如果注册成功，说明问题确实在 RLS 策略

-- 然后重新启用 RLS 并应用正确的策略
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## 执行步骤

### 步骤 1: 清理策略

执行 `cleanup_and_fix_rls.sql` 脚本：

```sql
-- 这个脚本会：
-- 1. 删除所有重复的策略
-- 2. 创建简化的策略集
-- 3. 测试插入操作
-- 4. 验证触发器状态
```

### 步骤 2: 测试触发器

执行 `test_trigger_insert.sql` 脚本：

```sql
-- 这个脚本会：
-- 1. 测试直接插入（模拟触发器）
-- 2. 检查触发器函数
-- 3. 验证策略配置
```

### 步骤 3: 测试注册

1. 尝试注册新用户
2. 检查 Supabase 日志
3. 验证用户是否创建成功
4. 检查 `public.users` 表是否有新记录

## 关键点

### 1. RLS 策略优先级

在 PostgreSQL 中，RLS 策略使用 **OR** 逻辑：
- 如果**任何一个**策略允许操作，操作就会被允许
- 所以 "Bypass RLS for trigger and service role" 策略（`USING (true)`）应该允许所有操作

### 2. 触发器函数上下文

触发器函数使用 `SECURITY DEFINER`：
- 函数以函数所有者（postgres）的权限运行
- 但 RLS 策略仍然会检查
- 所以我们需要 "Bypass RLS" 策略

### 3. Supabase 特定行为

Supabase 可能对 RLS 策略有特殊处理：
- 某些策略可能在 Supabase 的上下文中不工作
- 需要测试来确定哪些策略有效

## 验证清单

- [ ] 执行 `cleanup_and_fix_rls.sql` 脚本
- [ ] 检查策略列表（应该只有 4 个策略）
- [ ] 测试插入操作（应该成功）
- [ ] 检查触发器函数（应该存在）
- [ ] 检查触发器（应该存在）
- [ ] 测试注册功能
- [ ] 检查 Supabase 日志
- [ ] 验证用户数据同步

## 如果问题仍然存在

1. **检查 Supabase 日志**：
   - 查看详细的错误信息
   - 查找触发器函数的错误

2. **检查触发器函数**：
   - 验证函数是否正确创建
   - 检查函数是否有正确的权限

3. **临时禁用 RLS**：
   - 测试注册是否成功
   - 如果成功，说明问题在 RLS 策略

4. **联系 Supabase 支持**：
   - 如果问题仍然存在，可能需要 Supabase 支持帮助

## 下一步

1. 执行 `cleanup_and_fix_rls.sql` 脚本
2. 执行 `test_trigger_insert.sql` 脚本
3. 测试注册功能
4. 检查 Supabase 日志
5. 如果问题仍然存在，查看详细的错误信息

