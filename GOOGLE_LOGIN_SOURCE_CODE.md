# Google 登录源代码位置

本文档列出了所有与 Google OAuth 登录相关的源代码文件及其功能。

## 📁 核心文件

### 1. **前端登录页面** - 启动 Google OAuth
**文件路径**: `app/auth/login/page.js`

**关键代码位置**:
- **第 18 行**: `googleLoading` 状态管理
- **第 134-172 行**: `handleGoogleLogin` 函数 - 启动 Google OAuth 流程
- **第 318-383 行**: Google OAuth 按钮 UI 组件

**功能**:
- 显示 "Continue with Google" 按钮
- 调用 `supabase.auth.signInWithOAuth({ provider: 'google' })`
- 处理 OAuth 错误和加载状态
- 读取 URL 中的错误参数并显示

---

### 2. **OAuth 回调处理** - 处理 Google 返回的授权码
**文件路径**: `app/api/auth/callback/route.js`

**关键代码位置**:
- **第 9-47 行**: 解析 OAuth 回调参数（code, error, state）
- **第 58-105 行**: 使用 Supabase 交换授权码获取用户信息
- **第 140-254 行**: 更新现有用户（如果邮箱已存在）
- **第 255-295 行**: 创建新用户（如果邮箱不存在）
- **第 301-450 行**: 详细的错误处理和日志记录

**功能**:
- 接收 Google OAuth 回调
- 从 Supabase 获取用户信息
- 同步用户到本地 `users` 表
- 处理不同角色（user, merchant, admin）
- 设置 `auth_provider='google'` 和 `email_verified_at`
- 重定向到成功页面或显示错误

---

### 3. **OAuth 成功页面** - 保存会话并重定向
**文件路径**: `app/auth/oauth-success/page.js`

**关键代码位置**:
- **第 6-95 行**: `OAuthSuccessContent` 组件
- **第 14-50 行**: 解析 URL 中的会话数据并保存到 localStorage
- **第 33-40 行**: 根据角色保存到不同的 localStorage key
- **第 96-137 行**: `OAuthSuccessPage` 主组件（包含 Suspense 边界）

**功能**:
- 从 URL 参数读取会话数据
- 保存到 `localStorage`（`userSession` 或 `merchantUser`）
- 根据用户角色重定向到相应页面：
  - `user` → `/account`
  - `merchant` → `/merchant`
  - `admin` → `/admin`

---

### 4. **登录表单组件** - 可复用的登录表单
**文件路径**: `components/LoginForm.js`

**关键代码位置**:
- **第 13 行**: `googleLoading` 状态
- **第 60-120 行**: `handleGoogleLogin` 函数（与 `app/auth/login/page.js` 类似）
- **第 200-280 行**: Google OAuth 按钮 UI

**功能**:
- 可复用的登录表单组件
- 包含 Google OAuth 按钮
- 用于账户页面等需要登录的地方

---

## 🔧 辅助文件

### 5. **Supabase 客户端工具**
**文件路径**: `lib/supabase-client.js`

**功能**:
- 提供 `getSupabaseClient()` 函数
- 用于前端调用 Supabase Auth API
- 配置 Supabase URL 和 Anon Key

---

### 6. **账户页面** - 隐藏邮箱验证提示
**文件路径**: `app/account/page.js`

**关键代码位置**:
- **第 398 行**: 条件渲染邮箱验证提示
- 检查 `user.auth_provider !== 'google'` 来隐藏 Google 用户的验证提示

**功能**:
- Google 用户默认视为已验证邮箱
- 不显示邮箱验证提示横幅

---

## 📚 文档文件

### 7. **Google OAuth 设置指南**
**文件路径**: `GOOGLE_OAUTH_SETUP.md`

**内容**:
- 数据库迁移 SQL（添加 `auth_provider` 字段）
- Supabase 配置步骤
- 环境变量设置

---

### 8. **Google OAuth 故障排除指南**
**文件路径**: `GOOGLE_OAUTH_TROUBLESHOOTING.md`

**内容**:
- 常见错误及解决方案
- 诊断步骤
- 调试技巧

---

### 9. **OAuth 错误诊断端点**
**文件路径**: `app/api/debug/oauth-error/route.js`

**功能**:
- 用于调试 OAuth 错误的 API 端点
- 记录详细的错误信息

---

## 🔄 完整流程

```
1. 用户点击 "Continue with Google" 按钮
   ↓
   app/auth/login/page.js (handleGoogleLogin)
   ↓
2. 调用 supabase.auth.signInWithOAuth({ provider: 'google' })
   ↓
3. 重定向到 Google 登录页面
   ↓
4. 用户授权后，Google 重定向回应用
   ↓
   app/api/auth/callback/route.js (GET /api/auth/callback)
   ↓
5. 交换授权码获取用户信息
   ↓
6. 同步用户到本地 users 表
   ↓
7. 重定向到 /auth/oauth-success?session=...
   ↓
   app/auth/oauth-success/page.js
   ↓
8. 保存会话到 localStorage
   ↓
9. 重定向到相应页面（/account, /merchant, 或 /admin）
```

---

## 🔑 关键环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📝 数据库字段

Google OAuth 用户需要以下字段：
- `auth_provider`: 'google'
- `email_verified_at`: 自动设置为当前时间
- `password_hash`: NULL（OAuth 用户不需要密码）
- `registration_domain`: 注册域名（用于追踪）

---

## 🐛 常见问题排查

1. **"Database error saving new user"**
   - 检查 `password_hash` 是否允许 NULL
   - 检查 `auth_provider` 字段是否存在
   - 查看 Vercel 日志中的详细错误信息

2. **重定向循环**
   - 检查 Supabase 回调 URL 配置
   - 确保 `/api/auth/callback` 路由正常工作

3. **会话未保存**
   - 检查 `app/auth/oauth-success/page.js` 中的 localStorage 逻辑
   - 确认 URL 参数中的 session 数据格式正确

---

## 📞 相关 API 端点

- `GET /api/auth/callback` - OAuth 回调处理
- `POST /api/auth/login` - 邮箱密码登录（不用于 Google OAuth）
- `GET /api/debug/oauth-error` - OAuth 错误诊断

---

**最后更新**: 2024年（当前日期）

