# 修复注册和 OAuth 登录问题

## 问题描述

1. **注册失败**：用户注册时返回 500 错误
2. **Google OAuth 登录失败**：OAuth 回调后无法获取 session，一直显示 "Waiting for Supabase session..."

## 原因分析

1. **Supabase 客户端使用废弃的 API**：使用了 `createBrowserSupabaseClient`，应该使用 `createClient`
2. **注册表单语法错误**：模板字符串格式不正确
3. **OAuth 回调处理不完善**：没有正确等待和处理 OAuth 回调
4. **数据库表可能缺失**：`public.users` 表或触发器可能没有正确设置

## 修复步骤

### 1. 更新 Supabase 客户端

已更新 `lib/supabase-client.ts`，使用新的 `@supabase/supabase-js` API：

```typescript
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  if (!clientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }

  return clientInstance
}
```

### 2. 修复注册表单

已修复 `components/RegisterForm.js` 中的模板字符串语法错误：

```javascript
const emailRedirectTo = origin ? `${origin}/auth/verify-email` : undefined
```

### 3. 改进注册和 OAuth 登录错误处理

已更新 `lib/auth-context.js`：
- 改进了 `registerWithPassword` 函数，添加了更好的错误处理
- 改进了 `loginWithGoogle` 函数，确保正确设置 redirectTo
- 添加了详细的错误日志

### 4. 修复 OAuth 回调处理

已更新 `app/auth/oauth-success/page.js`：
- 添加了定期检查 session 的机制
- 添加了超时处理
- 改进了错误处理

### 5. 数据库修复

#### 5.1 执行数据库修复脚本

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 执行 fix_users_table_complete.sql
```

这个脚本会：
- 创建 `public.users` 表（如果不存在）
- 创建必要的索引
- 创建触发器函数和触发器
- 启用 RLS 并创建策略
- 同步现有的 auth.users 数据到 public.users

#### 5.2 验证数据库设置

执行 `verify_users_table.sql` 来验证设置：

```sql
-- 执行 verify_users_table.sql
```

### 6. 环境变量检查

确保以下环境变量已设置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 7. Supabase 配置检查

1. **启用 Google OAuth**：
   - 进入 Supabase Dashboard > Authentication > Providers
   - 启用 Google 提供商
   - 配置 Google OAuth 凭据（Client ID 和 Client Secret）
   - 设置 Redirect URL：`https://your-domain.com/auth/oauth-success`

2. **邮箱验证设置**：
   - 进入 Supabase Dashboard > Authentication > Settings
   - 检查 "Enable email confirmations" 设置
   - 如果启用了邮箱验证，用户注册后需要验证邮箱才能登录

3. **URL 配置**：
   - 进入 Supabase Dashboard > Authentication > URL Configuration
   - 确保 Site URL 和 Redirect URLs 正确配置

## 测试步骤

### 1. 测试注册功能

1. 访问注册页面
2. 填写注册表单
3. 提交注册
4. 检查是否成功注册或收到错误消息

### 2. 测试 Google OAuth 登录

1. 访问登录页面
2. 点击 "Continue with Google"
3. 完成 Google 登录
4. 检查是否成功重定向到 `/auth/oauth-success`
5. 检查是否成功获取 session 并重定向到用户页面

### 3. 检查数据库

1. 在 Supabase Dashboard 中查看 `auth.users` 表
2. 查看 `public.users` 表
3. 确认新注册的用户已同步到 `public.users` 表

## 常见问题

### 1. 注册后没有 session

**原因**：如果启用了邮箱验证，Supabase 不会立即返回 session，用户需要先验证邮箱。

**解决方案**：
- 检查 Supabase 的邮箱验证设置
- 如果不需要邮箱验证，可以在 Supabase Dashboard 中禁用它
- 或者提示用户检查邮箱并验证

### 2. OAuth 回调后 session 为 null

**原因**：
- OAuth 回调处理时间过长
- 数据库触发器没有正确同步用户
- RLS 策略阻止了访问

**解决方案**：
- 检查数据库触发器是否正常工作
- 检查 RLS 策略是否正确设置
- 查看浏览器控制台和 Supabase 日志

### 3. "Missing Supabase environment variables" 错误

**原因**：环境变量未正确设置。

**解决方案**：
- 检查 `.env.local` 文件
- 确保环境变量名称正确
- 重启开发服务器

## 文件更改清单

1. `lib/supabase-client.ts` - 更新 Supabase 客户端
2. `lib/auth-context.js` - 改进注册和 OAuth 登录
3. `components/RegisterForm.js` - 修复语法错误和改进错误处理
4. `app/auth/oauth-success/page.js` - 改进 OAuth 回调处理
5. `supabase/migrations/fix_users_table_complete.sql` - 数据库修复脚本
6. `supabase/migrations/verify_users_table.sql` - 数据库验证脚本

## 下一步

1. 执行数据库修复脚本
2. 验证数据库设置
3. 测试注册功能
4. 测试 Google OAuth 登录
5. 检查错误日志
6. 根据需要调整配置

## 支持

如果问题仍然存在，请检查：
1. Supabase Dashboard 中的日志
2. 浏览器控制台中的错误
3. 网络请求的响应
4. 数据库触发器日志

