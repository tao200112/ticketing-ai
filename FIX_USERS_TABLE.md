# 修复 users 表缺失问题

## 问题描述

生产环境出现以下错误：
- `Could not find the table 'public.users' in the schema cache`
- `/api/auth/register` 返回 500 错误
- `/api/auth/login-from-supabase` 返回 500 错误

## 原因

生产环境的 Supabase 数据库中缺少 `public.users` 表。这个表应该通过数据库迁移创建，但可能没有正确执行。

## 解决方案

### 步骤 1: 在 Supabase 数据库中执行迁移脚本

1. 登录到 Supabase Dashboard
2. 进入你的项目
3. 打开 SQL Editor
4. 执行以下迁移脚本：

```sql
-- 文件: supabase/migrations/20251111_create_users_table_complete.sql
```

或者直接复制脚本内容并执行。

### 步骤 2: 验证表是否创建成功

执行以下查询验证表是否存在：

```sql
-- 检查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);

-- 检查表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 检查触发器
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';
```

### 步骤 3: 验证数据同步

执行以下查询检查数据是否同步：

```sql
-- 检查 auth.users 和 public.users 的数据
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name,
  COUNT(*) as count
FROM public.users;
```

### 步骤 4: 测试注册和登录功能

1. 测试邮箱注册功能
2. 测试 Google OAuth 登录功能
3. 检查错误日志，确认不再出现 `public.users` 表缺失的错误

## 迁移脚本说明

迁移脚本 `20251111_create_users_table_complete.sql` 会：

1. **创建 users 表**（如果不存在）
   - 包含所有必需的列：id, email, name, role, age, password_hash, auth_provider, email_verified_at, is_active, created_at, updated_at
   - 设置唯一约束：(email, role)
   - 设置外键约束：id 引用 auth.users(id)

2. **创建索引**
   - idx_users_email
   - idx_users_role
   - idx_users_auth_provider
   - idx_users_email_role

3. **创建触发器函数**
   - `handle_new_auth_user_to_users()` - 自动将 auth.users 中的新用户同步到 public.users

4. **设置 RLS (Row Level Security) 策略**
   - 允许服务角色完全管理用户
   - 允许用户查看和更新自己的资料
   - 允许公开注册（插入新用户）
   - 允许认证用户读取用户数据

5. **回填历史数据**
   - 将现有的 auth.users 数据同步到 public.users

## 注意事项

1. **幂等性**: 迁移脚本是幂等的，可以安全地多次执行
2. **数据安全**: 迁移脚本使用 `ON CONFLICT` 处理冲突，不会丢失数据
3. **触发器**: 触发器会在新用户注册时自动同步数据
4. **RLS 策略**: 确保数据安全，只有授权用户才能访问数据

## 如果问题仍然存在

如果执行迁移后问题仍然存在，请检查：

1. **Supabase 项目配置**
   - 确认使用的是正确的 Supabase 项目
   - 检查环境变量是否正确设置

2. **API 路由**
   - 检查 `/api/auth/register` 和 `/api/auth/login-from-supabase` 路由
   - 确认这些路由不再被使用（应该使用 Supabase Auth 直接）

3. **前端代码**
   - 确认前端使用 Supabase Auth 进行注册和登录
   - 检查 `lib/auth-context.js` 是否正确配置

4. **错误日志**
   - 查看详细的错误日志
   - 确认错误是否来自其他地方

## 相关文件

- `supabase/migrations/20251111_create_users_table_complete.sql` - 完整的迁移脚本
- `supabase/migrations/202511080345_handle_new_auth_user_upsert.sql` - 用户同步触发器
- `lib/auth-context.js` - 认证上下文
- `app/api/auth/register/route.js` - 注册 API 路由（已废弃）
- `app/api/auth/login-from-supabase/route.js` - 登录 API 路由（已废弃）

