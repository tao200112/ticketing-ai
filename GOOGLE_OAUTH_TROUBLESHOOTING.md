# Google OAuth 问题排查指南

## 当前问题

迁移已运行，但仍显示 "Database error saving new user" 错误。

## 诊断步骤

### 1. 检查表结构

在 Supabase SQL Editor 中运行以下查询，验证表结构：

```sql
-- 运行文件: supabase/migrations/verify_users_table_structure.sql
```

或者直接运行：

```sql
-- 检查所有列
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 检查约束
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- 检查关键字段
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'auth_provider'
    ) THEN 'EXISTS' ELSE 'MISSING' END as auth_provider,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified_at'
    ) THEN 'EXISTS' ELSE 'MISSING' END as email_verified_at,
    (SELECT is_nullable FROM information_schema.columns 
     WHERE table_name = 'users' AND column_name = 'password_hash') as password_hash_nullable;
```

### 2. 查看详细错误信息

现在错误处理已改进，登录页面会显示更详细的错误信息，包括：
- 错误代码
- 错误消息
- 详细信息 (details)
- 提示 (hint)

**请再次尝试 Google 登录，查看登录页面上显示的具体错误信息。**

### 3. 检查 Vercel 日志

在 Vercel Dashboard 中查看函数日志：
1. 进入 Vercel Dashboard
2. 选择你的项目
3. 进入 **Functions** 标签
4. 查看 `/api/auth/callback` 的日志
5. 查找包含 "Error creating user" 的日志条目

日志现在会包含完整的错误信息，包括：
- `errorCode`: PostgreSQL 错误代码
- `errorMessage`: 错误消息
- `errorDetails`: 详细信息
- `errorHint`: 数据库提示
- `userData`: 尝试插入的数据

### 4. 常见问题及解决方案

#### 问题 1: `auth_provider` 字段不存在

**症状**: 错误代码可能包含 "column auth_provider does not exist"

**解决**: 确保运行了完整的迁移文件 `add_auth_provider_to_users.sql`

#### 问题 2: `password_hash` 不允许 NULL

**症状**: 错误代码 `23502` 或 "null value in column password_hash"

**解决**: 迁移文件应该已经处理了这个问题。如果仍然存在，手动运行：

```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

#### 问题 3: CHECK 约束失败

**症状**: 错误代码 `23514` 或 "check constraint violation"

**可能原因**:
- `auth_provider` 的值不在允许的列表中 ('email', 'google')
- `age` 值小于 16
- `role` 值不在允许的列表中

**解决**: 检查插入的数据是否符合所有约束

#### 问题 4: 字段类型不匹配

**症状**: 错误消息包含 "invalid input syntax" 或类型相关错误

**解决**: 检查字段类型：
- `age` 必须是 INTEGER
- `email_verified_at` 必须是 TIMESTAMPTZ
- `auth_provider` 必须是 TEXT

### 5. 手动测试插入

在 Supabase SQL Editor 中尝试手动插入一个测试用户：

```sql
INSERT INTO users (
    email,
    name,
    age,
    auth_provider,
    email_verified_at,
    role
) VALUES (
    'test-google@example.com',
    'Test User',
    18,
    'google',
    NOW(),
    'user'
) RETURNING *;
```

如果这个插入失败，错误信息会告诉我们具体问题。

### 6. 检查现有用户数据

查看现有用户的结构：

```sql
SELECT * FROM users LIMIT 1;
```

检查是否有任何字段缺失或类型不匹配。

## 下一步

1. **运行验证脚本** (`verify_users_table_structure.sql`)
2. **再次尝试 Google 登录**，查看详细的错误信息
3. **检查 Vercel 日志**，查看完整的错误详情
4. **根据具体错误信息**，采取相应的修复措施

如果错误信息仍然不够详细，请提供：
- 登录页面上显示的具体错误消息
- Vercel 日志中的错误详情
- 验证脚本的运行结果

这样我可以更准确地诊断问题。

