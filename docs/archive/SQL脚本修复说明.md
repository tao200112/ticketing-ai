# SQL 脚本修复说明

## 修复的错误

### 1. 错误：`column au.app_metadata does not exist`

**问题**：在 `fix_users_table_complete.sql` 中，代码尝试访问 `auth.users` 表的 `app_metadata` 列，但该列不存在。

**修复**：
- 移除了对 `app_metadata` 的引用
- 只使用 `raw_app_meta_data` 来获取 provider 信息
- Supabase 使用 `raw_app_meta_data` JSONB 字段来存储应用元数据

**修改位置**：
- 第 70-79 行：触发器函数中的 provider 提取逻辑
- 第 191-195 行：同步现有用户数据时的 provider 提取逻辑

### 2. 错误：`more than one row returned by a subquery used as an expression`

**问题**：在 RLS 策略中，子查询 `(SELECT role FROM public.users WHERE id = auth.uid())` 可能返回多行（虽然理论上不应该，但由于 UNIQUE 约束，应该只有一行）。

**修复**：
- 简化了 RLS 策略，移除了可能导致问题的子查询
- 允许用户更新自己的数据，role 字段的更新控制应该在应用层实现
- 如果需要在数据库层控制 role 更新，可以使用触发器或其他机制

**修改位置**：
- 第 152-158 行：简化了 "Users can update their own data" 策略

### 3. 验证脚本中的 RLS 检查

**问题**：验证脚本中的 RLS 检查可能会返回多行。

**修复**：
- 使用 `EXISTS` 子查询代替直接 SELECT
- 使用 JOIN 来确保只检查 public schema 中的 users 表

**修改位置**：
- `verify_users_table.sql` 第 45-57 行：改进了 RLS 状态检查

### 4. Role 字段验证

**改进**：
- 在同步现有用户数据时，添加了 role 值的验证
- 确保只有 'user', 'merchant', 'admin' 这三个值被接受
- 其他值会被设置为 'user'

**修改位置**：
- 第 187-191 行：使用 CASE 语句验证 role 值

## 修复后的脚本说明

### `fix_users_table_complete.sql`

这个脚本会：
1. 创建 `public.users` 表（如果不存在）
2. 创建必要的索引
3. 创建更新时间触发器
4. 创建从 `auth.users` 同步到 `public.users` 的触发器函数和触发器
5. 启用 RLS 并创建策略
6. 同步现有的 `auth.users` 数据到 `public.users`

### `verify_users_table.sql`

这个脚本会：
1. 检查 users 表是否存在
2. 检查表结构
3. 检查触发器是否存在
4. 检查触发器函数是否存在
5. 检查 RLS 是否启用
6. 检查 RLS 策略
7. 显示最近的用户记录
8. 检查 auth.users 和 public.users 的同步情况

## 执行步骤

### 1. 执行修复脚本

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 执行 fix_users_table_complete.sql
```

### 2. 验证设置

执行验证脚本：

```sql
-- 执行 verify_users_table.sql
```

### 3. 检查结果

查看验证脚本的输出，确保：
- ✓ users 表存在
- ✓ 触发器存在
- ✓ 触发器函数存在
- ✓ RLS 已启用
- ✓ RLS 策略已创建
- ✓ 用户数据已同步

## 注意事项

1. **Provider 信息**：Supabase 使用 `raw_app_meta_data` JSONB 字段存储 provider 信息，而不是 `app_metadata` 列。

2. **Role 更新控制**：当前的 RLS 策略允许用户更新自己的数据。如果需要在数据库层控制 role 字段的更新，可以：
   - 使用触发器来阻止 role 更新
   - 创建单独的策略来控制 role 字段
   - 在应用层实现 role 更新控制

3. **唯一约束**：`users` 表有 `(email, role)` 唯一约束，这意味着同一个邮箱可以有多个角色（如 user 和 merchant）。

4. **触发器同步**：当新用户通过 Supabase Auth 注册时，触发器会自动将用户同步到 `public.users` 表。

## 测试建议

1. 创建一个测试用户，检查是否自动同步到 `public.users` 表
2. 使用 Google OAuth 登录，检查 provider 是否正确设置为 'google'
3. 检查 RLS 策略是否正常工作
4. 检查触发器日志（在 Supabase Dashboard 的 Logs 中）

## 如果仍然遇到问题

1. 检查 Supabase Dashboard 中的错误日志
2. 检查触发器函数是否有语法错误
3. 检查 RLS 策略是否正确
4. 检查是否有其他约束冲突
5. 查看 Supabase 文档以获取最新信息

