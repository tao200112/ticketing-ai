# Google OAuth 配置指南

## 🔍 问题分析

当使用 Supabase 的 `signInWithOAuth` 时，OAuth 流程如下：

1. 用户点击 "Continue with Google"
2. Supabase 重定向到 Google 登录页面
3. Google 认证后，**重定向到 Supabase 的回调 URL**：`https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase 处理 OAuth，然后重定向到我们在 `redirectTo` 中指定的 URL（我们的 `/api/auth/callback`）
5. 我们的 `/api/auth/callback` 使用 `exchangeCodeForSession` 交换会话

## ✅ 正确的配置

### 1. Google Cloud Console 配置

**在 Google Cloud Console 中，Authorized Redirect URIs 应该配置为：**

```
https://htaqcvnyipiqdbmvvfvj.supabase.co/auth/v1/callback
```

**⚠️ 重要：** 这是 Supabase 的回调 URL，**不是**我们应用的 `/api/auth/callback`！

### 2. Supabase Dashboard 配置

**在 Supabase Dashboard > Authentication > URL Configuration 中：**

#### Site URL
```
https://ticketing-ai-six.vercel.app
```
（或您的生产环境 URL）

#### Redirect URLs
添加以下 URL（每行一个）：
```
https://ticketing-ai-six.vercel.app/**
https://ticketing-ai-six.vercel.app/api/auth/callback
http://localhost:3000/**
http://localhost:3000/api/auth/callback
```

### 3. 代码配置（已正确）

我们的代码配置是正确的：

```javascript
// app/auth/login/page.js
const redirectUrl = `${siteUrl}/api/auth/callback`

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,  // ✅ 这是 Supabase 处理完 OAuth 后重定向到的 URL
    queryParams: {
      state: state
    }
  }
})
```

```javascript
// app/api/auth/callback/route.js
// ✅ 使用 exchangeCodeForSession 是正确的
const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)
```

## 🔧 修复步骤

### 步骤 1: 更新 Google Cloud Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 导航至 **APIs & Services** > **Credentials**
4. 找到您的 OAuth 2.0 Client ID
5. 在 **Authorized redirect URIs** 中：
   - ✅ **添加**：`https://htaqcvnyipiqdbmvvfvj.supabase.co/auth/v1/callback`
   - ❌ **删除**（如果存在）：`https://ticketing-ai-six.vercel.app/api/auth/callback`

### 步骤 2: 更新 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard/project/htaqcvnyipiqdbmvvfvj)
2. 导航至 **Authentication** > **URL Configuration**
3. 确保 **Site URL** 设置为您的生产环境 URL
4. 在 **Redirect URLs** 中添加：
   ```
   https://ticketing-ai-six.vercel.app/**
   https://ticketing-ai-six.vercel.app/api/auth/callback
   http://localhost:3000/**
   http://localhost:3000/api/auth/callback
   ```

### 步骤 3: 验证配置

1. 清除浏览器缓存和 cookies
2. 尝试 Google 登录
3. 检查浏览器网络请求：
   - 应该看到重定向到 `https://htaqcvnyipiqdbmvvfvj.supabase.co/auth/v1/callback`
   - 然后重定向到 `https://ticketing-ai-six.vercel.app/api/auth/callback?code=...`

## 📋 配置检查清单

- [ ] Google Cloud Console 中配置了 `https://htaqcvnyipiqdbmvvfvj.supabase.co/auth/v1/callback`
- [ ] Supabase Dashboard 中配置了 Site URL
- [ ] Supabase Dashboard 中配置了 Redirect URLs（包含我们的应用 URL）
- [ ] 代码中的 `redirectTo` 指向 `/api/auth/callback`
- [ ] `/api/auth/callback` 路由使用 `exchangeCodeForSession`

## 🐛 常见错误

### 错误 1: "redirect_uri_mismatch"
**原因**：Google Cloud Console 中的 Redirect URI 配置不正确
**解决**：确保配置为 `https://htaqcvnyipiqdbmvvfvj.supabase.co/auth/v1/callback`

### 错误 2: "Invalid redirect URL"
**原因**：Supabase Dashboard 中的 Redirect URLs 未包含我们的应用 URL
**解决**：在 Supabase Dashboard 中添加应用 URL 到 Redirect URLs

### 错误 3: "Code exchange failed"
**原因**：代码过期或已使用
**解决**：确保 `exchangeCodeForSession` 在收到回调后立即调用

## 📚 参考文档

- [Supabase Google OAuth 文档](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)



