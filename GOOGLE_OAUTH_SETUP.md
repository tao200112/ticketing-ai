# Google OAuth 登录设置指南

## 问题排查

如果 Google 登录后跳转回登录页面并显示 "Database error saving new user"，请按以下步骤检查：

### 1. 运行数据库迁移

**重要：必须先运行数据库迁移添加 `auth_provider` 字段！**

在 Supabase SQL Editor 中运行以下迁移文件：

```sql
-- 文件路径: supabase/migrations/add_auth_provider_to_users.sql
```

或者直接运行以下 SQL：

```sql
-- Add auth_provider column to users table for OAuth support
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'auth_provider'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN auth_provider TEXT DEFAULT 'email' 
        CHECK (auth_provider IN ('email', 'google'));
        
        RAISE NOTICE 'Added auth_provider column to users table';
    ELSE
        RAISE NOTICE 'auth_provider column already exists in users table';
    END IF;
END $$;

-- Ensure email_verified_at exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN email_verified_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added email_verified_at column to users table';
    ELSE
        RAISE NOTICE 'email_verified_at column already exists in users table';
    END IF;
END $$;

-- Create index for auth_provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have 'email' as auth_provider if null
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;
```

### 2. 配置 Supabase Google Provider

1. 登录 Supabase Dashboard
2. 进入 **Authentication** > **Providers**
3. 找到 **Google** 并启用
4. 配置 Redirect URL：
   - 开发环境：`http://localhost:3000/api/auth/callback`
   - 生产环境：`https://your-domain.com/api/auth/callback`
   - 确保在 Google Cloud Console 中也配置了相同的 Redirect URI

### 3. 检查环境变量

确保以下环境变量已正确配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. 常见错误及解决方案

#### 错误：`Database error saving new user`

**原因：** `auth_provider` 字段不存在

**解决：** 运行上面的数据库迁移

#### 错误：`User with this email already exists`

**原因：** 该邮箱已存在，但可能使用不同的登录方式

**解决：** 系统会自动更新现有用户的 `auth_provider` 为 'google'

#### 错误：`Missing required field`

**原因：** 数据库约束要求某些字段不能为空

**解决：** 检查 `users` 表的约束，确保所有必需字段都有默认值

### 5. 测试流程

1. 访问登录页面：`/auth/login`
2. 点击 "Continue with Google" 按钮
3. 完成 Google 授权
4. 应该自动重定向到 `/account` 页面
5. 如果出现错误，错误信息会显示在登录页面上

### 6. 调试

如果问题仍然存在，检查：

1. **浏览器控制台**：查看是否有 JavaScript 错误
2. **网络请求**：检查 `/api/auth/callback` 的响应
3. **Supabase 日志**：在 Supabase Dashboard > Logs 中查看错误日志
4. **Vercel 日志**：在生产环境中查看 Vercel 函数日志

### 7. 验证迁移是否成功

运行以下 SQL 查询验证字段是否存在：

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('auth_provider', 'email_verified_at');
```

应该看到两行结果，分别对应 `auth_provider` 和 `email_verified_at` 字段。

