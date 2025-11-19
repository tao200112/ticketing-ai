# Supabase 认证修复文档

本文档描述了 PartyTix 项目中 Supabase 认证系统的修复内容，解决了注册→邮箱验证→会话→重定向流程中的所有问题。

## 修复的问题

1. ✅ **AuthSessionMissingError: Auth session missing** - 修复了注册后出现的会话缺失错误
2. ✅ **注册后自动登录和重定向** - 确保用户注册后自动登录并重定向到 `/account`
3. ✅ **邮箱验证回调处理** - 正确处理 Supabase 邮箱验证回调（即使邮箱验证现在是可选的）
4. ✅ **环境变量配置** - 确保正确使用 `NEXT_PUBLIC_SITE_URL` 和 Supabase keys
5. ✅ **回调路由** - 添加 `/auth/callback` 路由以正确接收 Supabase 重定向验证
6. ✅ **Supabase 客户端配置** - 修复 Supabase 客户端以便会话 cookies 在 Vercel 上正常工作
7. ✅ **统一登录后处理** - 清理并统一 `handleAfterLogin()` 的使用

## 修复内容

### 1. Supabase 浏览器客户端配置

**文件**: `lib/supabase/client.ts`

**修复内容**:
- 使用 `createBrowserClient` 从 `@supabase/ssr`
- 配置 PKCE 流程 (`flowType: "pkce"`)
- 启用自动刷新 token (`autoRefreshToken: true`)
- 启用会话持久化 (`persistSession: true`)
- 使用单例模式确保只有一个 GoTrueClient 实例

**配置示例**:
```typescript
browserSupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
  },
})
```

### 2. 注册流程修复

**文件**: 
- `app/auth/register/page.js`
- `components/RegisterForm.js`
- `lib/auth-context.js`

**修复内容**:
- 当 `data.session` 存在时，调用 `handleAfterLogin()` 并重定向到 `/account`
- 当 `data.session` 为 null（需要邮箱验证）时，显示成功消息但不尝试获取用户或重定向
- 使用 `NEXT_PUBLIC_SITE_URL` 或 `window.location.origin` 作为回调 URL
- 将 `emailRedirectTo` 设置为 `/auth/callback` 而不是 `/auth/verify-email`

**关键代码**:
```javascript
if (data.session) {
  setMessage('Registration successful! Redirecting...')
  const { handleAfterLogin } = await import('@/lib/auth-after-login')
  await handleAfterLogin({
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    router,
  })
  return
}

// 如果没有 session（需要邮箱验证），显示成功消息但不重定向
setMessage('Registration successful! Please check your email to confirm your account.')
```

### 3. 邮箱验证回调路由

**文件**: `app/auth/callback/page.tsx` (新建)

**功能**:
- 处理 PKCE 流程的 code exchange
- 显示验证完成消息
- 如果已认证，使用 `handleAfterLogin()` 重定向到 `/account`
- 处理错误情况并显示友好的错误消息

**关键功能**:
- 检查 URL 中的 `code` 参数（PKCE 流程）
- 使用 `supabase.auth.exchangeCodeForSession(code)` 交换会话
- 如果成功，调用 `handleAfterLogin()` 进行统一的重定向处理

### 4. 统一登录后处理

**所有登录流程现在都使用 `handleAfterLogin()`**:
- ✅ 邮箱/密码登录 (`components/LoginForm.js`, `app/auth/login/page.js`)
- ✅ Google OAuth 登录 (`app/auth/oauth-success/page.js`)
- ✅ 注册 (`app/auth/register/page.js`, `components/RegisterForm.js`)
- ✅ 邮箱验证回调 (`app/auth/callback/page.tsx`)

**`handleAfterLogin()` 功能**:
- 调用 `/api/auth/after-login` API
- 根据用户类型（普通用户/商家）决定重定向路径
- 处理密码设置需求
- 处理 onboarding 需求
- 默认重定向到 `/account`

### 5. 统一 Supabase 客户端使用

**修复的文件**:
- `app/auth/oauth-success/page.js`
- `app/auth/verify-email/page.js`
- `app/auth/forgot-password/page.js`
- `app/auth/reset-password/page.js`
- `app/auth/update-password/page.js`
- `components/EmailVerificationBanner.js`

**修复内容**:
- 将所有 `getSupabaseClient()` 从 `@/lib/supabase-client` 改为 `getSupabaseBrowserClient()` 从 `@/lib/supabase/client`
- 确保整个应用只使用一个 Supabase 浏览器客户端实例
- 消除 "Multiple GoTrueClient instances" 警告

## 环境变量配置

### 必需的 Vercel 环境变量

在 Vercel 项目设置中配置以下环境变量：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 站点 URL（用于重定向和回调）
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**重要**: `NEXT_PUBLIC_SITE_URL` 必须：
- 不包含尾随斜杠
- 使用正确的协议（https 用于生产环境）
- 与 Vercel 部署的域名匹配

### Supabase 重定向 URL 配置

在 Supabase Dashboard → Authentication → URL Configuration 中配置：

**Site URL**:
```
https://your-app.vercel.app
```

**Redirect URLs** (添加以下所有 URL):
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/auth/oauth-success
https://your-app.vercel.app/auth/verify-email
```

**重要**: 
- 确保所有重定向 URL 都使用 HTTPS
- 确保 URL 与 `NEXT_PUBLIC_SITE_URL` 匹配
- 对于开发环境，添加 `http://localhost:3000/auth/callback` 等

## 会话 Cookie 配置

Supabase 使用以下 cookies 来管理会话：
- `sb-<project-ref>-auth-token` - 访问令牌
- `sb-<project-ref>-auth-token.0` - 访问令牌（如果超过 4KB）
- `sb-<project-ref>-auth-token-code-verifier` - PKCE code verifier

**在 Vercel 上的配置**:
- Cookies 自动设置正确的域名
- 使用 `SameSite=Lax` 和 `Secure` 标志（HTTPS）
- 自动处理跨域 cookie 设置

## 邮箱验证流程

### 当前配置

项目使用 `require_email_verification = false`（在数据库迁移中设置），这意味着：
- ✅ 用户可以在不验证邮箱的情况下登录和使用功能
- ✅ 系统不会阻止未验证邮箱的用户
- ✅ 如果 `user.email_confirmed_at` 为 null，只显示提示消息

### 邮箱验证流程（如果启用）

1. **注册时**:
   - 如果 `require_email_verification = true`，Supabase 会发送验证邮件
   - 用户点击邮件中的链接
   - 链接指向 `/auth/callback?code=...`
   - 回调页面使用 `exchangeCodeForSession()` 交换会话
   - 成功后重定向到 `/account`

2. **验证链接格式**:
   ```
   https://your-app.vercel.app/auth/callback?code=xxx&type=signup
   ```

## 测试清单

修复后，请验证以下功能：

- [ ] **注册流程**:
  - [ ] 注册新用户 → 自动登录 → 重定向到 `/account`
  - [ ] 没有 "AuthSessionMissingError" 错误
  - [ ] 控制台没有 "Multiple GoTrueClient instances" 警告

- [ ] **邮箱验证回调**:
  - [ ] 点击验证邮件链接 → 重定向到 `/auth/callback`
  - [ ] 显示 "Verification complete" 消息
  - [ ] 自动重定向到 `/account`

- [ ] **登录流程**:
  - [ ] 邮箱/密码登录 → 重定向到 `/account`
  - [ ] Google OAuth 登录 → 重定向到 `/account`
  - [ ] 所有登录流程都使用 `handleAfterLogin()`

- [ ] **会话管理**:
  - [ ] 刷新页面后会话仍然存在
  - [ ] Token 自动刷新
  - [ ] 登出后会话正确清除

## 常见问题

### Q: 为什么注册后没有自动登录？

A: 检查以下几点：
1. 确保 `data.session` 存在（如果 `require_email_verification = true`，可能没有 session）
2. 确保调用了 `handleAfterLogin()`
3. 检查浏览器控制台是否有错误

### Q: 邮箱验证链接不工作？

A: 检查以下几点：
1. 确保 Supabase Dashboard 中配置了正确的重定向 URL
2. 确保 `NEXT_PUBLIC_SITE_URL` 正确设置
3. 确保 `/auth/callback` 路由存在
4. 检查 URL 中的 `code` 参数是否存在

### Q: 在 Vercel 上会话不持久？

A: 检查以下几点：
1. 确保使用 `createBrowserClient` 从 `@supabase/ssr`
2. 确保配置了 `persistSession: true`
3. 确保 `NEXT_PUBLIC_SITE_URL` 正确设置
4. 检查浏览器控制台中的 cookie 设置

### Q: 仍然看到 "Multiple GoTrueClient instances" 警告？

A: 确保：
1. 所有客户端代码都使用 `getSupabaseBrowserClient()` 从 `@/lib/supabase/client`
2. 没有其他地方创建了新的 Supabase 客户端实例
3. 检查是否有旧的导入（如 `@/lib/supabase-client`）

## 相关文件

- `lib/supabase/client.ts` - 浏览器客户端单例
- `lib/supabase/server.ts` - 服务端客户端
- `lib/auth-context.js` - 认证上下文
- `lib/auth-after-login.js` - 登录后处理逻辑
- `app/auth/callback/page.tsx` - 邮箱验证回调页面
- `app/api/auth/after-login/route.js` - 登录后 API

## 更新日期

2025-01-15

## 作者

PartyTix Development Team

