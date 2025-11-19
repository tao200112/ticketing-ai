# Google 登录配置说明

## 已完成的工作

### 1. 依赖安装
- ✅ `@supabase/supabase-js` - Supabase 客户端
- ✅ `expo-auth-session` - OAuth 认证会话管理
- ✅ `expo-web-browser` - 系统浏览器集成
- ✅ `expo-constants` - 访问 app.json 配置
- ✅ `react-native-url-polyfill` - URL polyfill for React Native

### 2. 配置文件更新
- ✅ `app.json` - 添加了 `scheme: "partytix"` 和 Supabase 配置

### 3. 代码实现
- ✅ `lib/supabase.native.ts` - Supabase 原生客户端
- ✅ `lib/auth.ts` - Google 登录和邮箱登录函数
- ✅ `context/AuthContext.tsx` - 认证上下文管理
- ✅ `screens/LoginScreen.tsx` - 原生登录页面
- ✅ `App.tsx` - 集成认证流程和深链处理

## Supabase 配置要求

### 重要：需要在 Supabase 控制台配置重定向 URL

1. 登录 Supabase Dashboard: https://app.supabase.com
2. 选择你的项目
3. 进入 **Authentication** > **URL Configuration**
4. 在 **Redirect URLs** 中添加以下 URL：

```
partytix://auth-callback
```

**注意**：这个 URL 格式是 `{scheme}://{path}`，其中：
- `scheme` 来自 `app.json` 中的 `scheme: "partytix"`
- `path` 是我们在代码中定义的 `auth-callback`

### Google OAuth Provider 配置

确保在 Supabase 中已经启用了 Google Provider：
1. 进入 **Authentication** > **Providers**
2. 确保 **Google** 已启用
3. 配置 Google OAuth Client ID 和 Secret（如果还没有配置）

## 工作流程

1. **未登录状态**：显示原生登录页面（`LoginScreen`）
2. **点击 Google 登录**：
   - 调用 `signInWithGoogle()`
   - 打开系统浏览器进行 Google 登录
   - 登录成功后通过深链 `partytix://auth-callback` 返回 App
   - Supabase SDK 自动处理回调并更新 session
3. **已登录状态**：显示 WebView（原有功能）

## 深链处理

App 会自动处理 `partytix://auth-callback` 深链：
- 在 `App.tsx` 中使用 `Linking` API 监听深链
- OAuth 回调会自动触发 `onAuthStateChange` 更新 session

## 测试步骤

### Android 真机测试

1. **构建 APK**：
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```

2. **安装到设备**：
   - 下载构建的 APK
   - 安装到 Android 真机

3. **测试流程**：
   - 打开 App，应该看到原生登录页面
   - 点击 "Continue with Google"
   - 应该跳转到系统浏览器（不是 WebView）
   - 完成 Google 登录
   - 应该自动返回 App
   - 应该看到 WebView 主页面（已登录状态）
   - 关闭并重新打开 App，应该保持登录状态

### 常见问题

1. **"disallowed_useragent" 错误**：
   - ✅ 已解决：现在使用系统浏览器而不是 WebView

2. **回调不工作**：
   - 检查 Supabase 控制台中的 Redirect URLs 配置
   - 确保添加了 `partytix://auth-callback`

3. **Session 不持久化**：
   - 检查 `supabase.native.ts` 中的 `persistSession: true`
   - 确保 Supabase SDK 版本正确

## 与 Web 端兼容

- ✅ 使用同一个 Supabase 项目
- ✅ 共享同一个用户池
- ✅ Web 端和移动端可以互相登录/登出
- ✅ 不需要修改 Supabase 的 Google Provider 配置

## 文件结构

```
mobile/
├── lib/
│   ├── supabase.native.ts    # Supabase 原生客户端
│   └── auth.ts               # 认证函数（Google/Email）
├── context/
│   └── AuthContext.tsx        # 认证上下文
├── screens/
│   └── LoginScreen.tsx       # 登录页面
├── App.tsx                    # 主应用（集成认证）
└── app.json                   # Expo 配置（包含 scheme 和 Supabase 配置）
```

