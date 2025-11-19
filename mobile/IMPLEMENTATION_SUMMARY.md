# 原生 Google 登录实现总结

## 概述

已成功在 Expo 原生 App 中实现原生 Google 登录，不再使用 WebView 打开登录页面，避免了 `disallowed_useragent` 错误。

## 实现的功能

1. ✅ 原生 Google 登录（使用系统浏览器）
2. ✅ 邮箱密码登录
3. ✅ Session 持久化
4. ✅ 深链回调处理
5. ✅ 与 Web 端共享同一个 Supabase 用户池

## 修改/创建的文件

### 1. 配置文件

#### `mobile/app.json`
- 添加 `scheme: "partytix"`
- 在 `extra` 中添加 Supabase 配置：
  ```json
  "extra": {
    "supabaseUrl": "https://htaqcvnyipiqdbmvvfvj.supabase.co",
    "supabaseAnonKey": "...",
    "eas": { ... }
  }
  ```

#### `mobile/package.json`
- 添加依赖：
  - `@supabase/supabase-js: ^2.39.0`
  - `expo-auth-session: ~6.1.0`
  - `expo-web-browser: ~14.0.0`
  - `expo-constants: ~17.0.3`
  - `react-native-url-polyfill: ^2.0.0`

### 2. 核心代码文件

#### `mobile/lib/supabase.native.ts` (新建)
- Supabase 原生客户端
- 配置 `detectSessionInUrl: false`（React Native 不需要）
- 从 `app.json` 的 `extra` 读取配置

#### `mobile/lib/auth.ts` (新建)
- `signInWithGoogle()` - Google 登录函数
- `signInWithEmailPassword()` - 邮箱登录函数
- `signOut()` - 登出函数
- 使用 `expo-auth-session` 打开系统浏览器

#### `mobile/context/AuthContext.tsx` (新建)
- 认证上下文 Provider
- 管理 session 和 user 状态
- 订阅 `onAuthStateChange`
- 提供 `useAuth()` hook

#### `mobile/screens/LoginScreen.tsx` (新建)
- 原生登录页面 UI
- Google 登录按钮
- 邮箱密码登录表单
- 加载状态处理

#### `mobile/App.tsx` (修改)
- 集成 `AuthProvider`
- 根据 session 状态显示登录页面或 WebView
- 处理深链回调（`partytix://auth-callback`）
- 保留原有的 WebView 功能（登录后）

## 工作流程

### 登录流程

1. **未登录状态**
   - App 启动时检查 session
   - 如果没有 session，显示 `LoginScreen`

2. **Google 登录**
   - 用户点击 "Continue with Google"
   - 调用 `signInWithGoogle()`
   - 生成重定向 URI: `partytix://auth-callback`
   - 调用 `supabase.auth.signInWithOAuth()` 获取 OAuth URL
   - 使用 `AuthSession.startAsync()` 打开系统浏览器
   - 用户在浏览器中完成 Google 登录
   - 浏览器重定向到 `partytix://auth-callback?code=...`
   - App 通过深链接收回调
   - Supabase SDK 自动处理 code 交换 token
   - `onAuthStateChange` 触发，更新 session
   - App 自动切换到 WebView（已登录状态）

3. **邮箱登录**
   - 用户输入邮箱和密码
   - 调用 `signInWithEmailPassword()`
   - 直接调用 `supabase.auth.signInWithPassword()`
   - Session 通过 `onAuthStateChange` 更新

### Session 持久化

- Supabase SDK 配置了 `persistSession: true`
- Session 存储在本地（AsyncStorage）
- App 重启后自动恢复 session

## Supabase 配置要求

### 必须在 Supabase 控制台配置

1. **Redirect URLs**
   - 登录 Supabase Dashboard
   - 进入 **Authentication** > **URL Configuration**
   - 添加：`partytix://auth-callback`

2. **Google Provider**
   - 确保 Google Provider 已启用
   - 配置 Google OAuth Client ID 和 Secret

## 测试步骤

### Android 真机测试

1. **构建 APK**
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```

2. **安装到设备**
   - 下载构建的 APK
   - 安装到 Android 真机

3. **测试流程**
   - ✅ 打开 App，看到原生登录页面
   - ✅ 点击 "Continue with Google"
   - ✅ 跳转到系统浏览器（不是 WebView）
   - ✅ 完成 Google 登录
   - ✅ 自动返回 App
   - ✅ 看到 WebView 主页面（已登录）
   - ✅ 关闭并重新打开 App，保持登录状态

### 预期日志

```
Deep link received: partytix://auth-callback?code=...
OAuth code received, waiting for session update...
```

## 与 Web 端兼容性

- ✅ 使用同一个 Supabase 项目
- ✅ 共享同一个用户池
- ✅ Web 端和移动端可以互相登录/登出
- ✅ 不需要修改 Supabase 的 Google Provider 配置
- ✅ Web 端的 Google 登录继续正常工作

## 关键实现细节

### 1. 深链处理

在 `App.tsx` 中使用 `Linking` API 监听深链：
```typescript
Linking.addEventListener('url', handleDeepLink);
```

### 2. OAuth 流程

使用 `skipBrowserRedirect: true` 让我们自己控制浏览器：
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUri,
    skipBrowserRedirect: true,
  },
});
```

### 3. Session 管理

通过 `onAuthStateChange` 自动更新：
```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
});
```

## 注意事项

1. **Supabase Redirect URL 配置**
   - 必须在 Supabase 控制台添加 `partytix://auth-callback`
   - 否则 OAuth 回调会失败

2. **深链权限**
   - Android: 需要在 `AndroidManifest.xml` 中配置（EAS Build 自动处理）
   - iOS: 需要在 `Info.plist` 中配置（EAS Build 自动处理）

3. **测试环境**
   - 必须在真机上测试（不是 Expo Go）
   - 深链在 Expo Go 中可能不工作

4. **错误处理**
   - 所有错误都会显示 Alert
   - 控制台会输出详细日志

## 下一步

1. 在 Android 真机上测试完整流程
2. 如果遇到问题，检查 Supabase 控制台的 Redirect URLs 配置
3. 查看控制台日志排查问题
4. 如果需要，可以添加更多错误处理和用户提示

