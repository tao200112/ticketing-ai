# Google 登录方案总结

本文档总结了 PartyTix 项目中 Web 端和移动端（Expo）的 Google OAuth 登录实现方案。

## 📋 目录

1. [架构概览](#架构概览)
2. [Web 端实现](#web-端实现)
3. [移动端实现](#移动端实现)
4. [配置要求](#配置要求)
5. [数据流](#数据流)
6. [关键差异](#关键差异)
7. [测试指南](#测试指南)

---

## 🏗️ 架构概览

### 统一认证后端

- **认证服务**: Supabase Auth
- **用户存储**: 
  - `auth.users` (Supabase 管理)
  - `public.users` (业务用户表，通过触发器同步)
- **共享用户池**: Web 端和移动端使用同一个 Supabase 项目，共享用户数据

### 技术栈

**Web 端**:
- Next.js 15
- `@supabase/supabase-js` (浏览器客户端)
- `@supabase/ssr` (服务端渲染支持)

**移动端**:
- Expo ~54.0
- React Native 0.81.5
- `@supabase/supabase-js` (React Native 客户端)
- `expo-auth-session` (OAuth 会话管理)
- `expo-web-browser` (系统浏览器集成)

---

## 🌐 Web 端实现

### 核心文件

```
lib/
├── auth-context.js          # 认证上下文，提供 loginWithGoogle()
├── supabase/
│   └── client.ts            # Supabase 浏览器客户端
└── auth-after-login.js      # 登录后统一处理逻辑

app/
├── auth/
│   ├── login/page.js        # 登录页面
│   ├── oauth-success/page.js # OAuth 回调成功页面
│   └── callback/page.tsx    # 邮箱验证回调页面
└── api/
    └── auth/after-login/route.js # 登录后处理 API
```

### 实现流程

#### 1. 用户点击 Google 登录按钮

```165:196:lib/auth-context.js
  const loginWithGoogle = useCallback(
    async (options = {}) => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = options.redirectTo || (origin ? `${origin}/auth/oauth-success` : undefined);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            ...options,
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
              ...options.queryParams,
            },
          },
        });
        
        if (error) {
          console.error('Google login error:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Google login failed:', error);
        throw error;
      }
    },
    [supabase]
  );
```

**关键点**:
- 使用 `supabase.auth.signInWithOAuth()` 发起 OAuth 流程
- 重定向 URL 设置为 `/auth/oauth-success`
- 自动跳转到 Google 登录页面

#### 2. OAuth 回调处理

```1:87:app/auth/oauth-success/page.js
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { handleAfterLogin } from '@/lib/auth-after-login'

function OAuthSuccessContent() {
  const router = useRouter()
  const { loading, user, session } = useAuth()
  const [statusMessage, setStatusMessage] = useState('Processing login...')

  useEffect(() => {
    console.log('[OAuth] oauth-success page mounted')
    
    if (!loading && user) {
      setStatusMessage('Login successful, redirecting...')
      // 使用统一的 after-login 处理逻辑
      handleAfterLogin({ 
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        router 
      })
      return
    }

    // If still loading, wait
    if (loading) {
      setStatusMessage('Loading...')
      return
    }

    // If no user, wait for Supabase to process OAuth callback
    if (!user && !loading) {
      const checkInterval = setInterval(async () => {
        try {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
          const supabase = getSupabaseBrowserClient()
          
          // Use getUser() for security - authenticates user by contacting Supabase Auth server
          const { data: { user }, error } = await supabase.auth.getUser()
          
          if (error) {
            console.error('[OAuth] User error:', error)
            clearInterval(checkInterval)
            setStatusMessage('Login failed. Please try again.')
            setTimeout(() => {
              router.push('/auth/login')
            }, 2000)
            return
          }
          
          if (user) {
            // Get session separately for session object
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            
            if (currentSession) {
              clearInterval(checkInterval)
              setStatusMessage('Login successful, redirecting...')
              // 使用统一的 after-login 处理逻辑
              handleAfterLogin({ 
                path: typeof window !== 'undefined' ? window.location.pathname : '',
                router 
              })
            }
          }
        } catch (error) {
          console.error('[OAuth] Error checking session:', error)
        }
      }, 500)

      // Set timeout, if no session after 15 seconds, redirect to login page
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        if (!user) {
          setStatusMessage('Login timeout. Please try again.')
          setTimeout(() => {
            router.push('/auth/login')
          }, 2000)
        }
      }, 15000)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [loading, user, session, router])
```

**关键点**:
- 页面加载后轮询检查用户状态
- 使用 `supabase.auth.getUser()` 验证用户
- 成功后调用 `handleAfterLogin()` 统一处理登录后逻辑

#### 3. 登录后处理

`handleAfterLogin()` 函数负责：
- 根据用户角色和域名决定重定向目标
- 调用 `/api/auth/after-login` API 更新业务用户信息
- 处理用户首次登录的特殊逻辑

---

## 📱 移动端实现

### 核心文件

```
mobile/
├── App.tsx                  # 主应用，集成认证流程
├── app.json                 # Expo 配置（包含 scheme 和 Supabase 配置）
├── lib/
│   ├── auth.ts              # Google 登录函数
│   └── supabase.native.ts   # Supabase React Native 客户端
├── context/
│   └── AuthContext.tsx      # 认证上下文
└── screens/
    ├── LoginScreen.tsx       # 原生登录页面
    └── ForgotPasswordScreen.tsx
```

### 实现流程

#### 1. Supabase 客户端初始化

```1:25:mobile/lib/supabase.native.ts
/**
 * Supabase 原生客户端（React Native 专用）
 * 使用 app.json 中的 extra 配置
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please check app.json extra.supabaseUrl and extra.supabaseAnonKey'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // React Native 不需要检测 URL 中的 session
  },
});
```

**关键点**:
- 配置从 `app.json` 的 `extra` 字段读取
- 启用 `persistSession` 和 `autoRefreshToken`
- 禁用 `detectSessionInUrl`（React Native 不需要）

#### 2. Google 登录实现

```17:83:mobile/lib/auth.ts
export async function signInWithGoogle() {
  try {
    // 生成重定向 URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: Constants.expoConfig?.scheme || 'partytix',
      path: 'auth-callback',
    });

    // 调用 Supabase OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // 关键：让我们自己控制浏览器
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return { error };
    }

    if (!data?.url) {
      return { error: new Error('No OAuth URL returned from Supabase') };
    }

    // 使用 AuthSession 打开系统浏览器
    const result = await AuthSession.startAsync({
      authUrl: data.url,
      returnUrl: redirectUri,
    });

    if (result.type === 'success') {
      // 从 URL 中提取参数
      const { params } = result;
      
      // 处理 Supabase OAuth 回调
      // Supabase 会在回调 URL 中包含 code 或 error
      if (params?.error) {
        return { error: new Error(params.error_description || params.error) };
      }
      
      // 如果返回了 code，Supabase SDK 需要从回调 URL 中提取并交换 token
      // 由于使用了 skipBrowserRedirect: true，我们需要手动触发
      if (params?.code && result.url) {
        // 使用回调 URL 触发 Supabase 的 session 更新
        // Supabase SDK 会监听 URL 变化并自动处理
        // 我们只需要等待 onAuthStateChange 回调
      }
      
      // Session 会通过 onAuthStateChange 自动更新
      // 如果 session 没有立即更新，可能是异步处理中，等待即可
      return { result };
    } else if (result.type === 'cancel') {
      return { error: new Error('User cancelled authentication') };
    } else {
      return { error: new Error(`Authentication failed: ${result.type}`) };
    }
  } catch (error) {
    console.error('signInWithGoogle error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
```

**关键点**:
- 使用 `skipBrowserRedirect: true` 手动控制浏览器
- 使用 `expo-auth-session` 打开系统浏览器（不是 WebView）
- 深链回调 URL: `partytix://auth-callback`
- Session 通过 `onAuthStateChange` 自动更新

#### 3. 深链处理

```45:89:mobile/App.tsx
  // 处理深链回调（OAuth 重定向）
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // 处理 OAuth 回调
      if (url.includes('auth-callback')) {
        // 解析 URL 参数
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');
          
          if (error) {
            console.error('OAuth error:', error);
            Alert.alert('登录失败', 'Google 登录失败，请重试');
            return;
          }
          
          if (code) {
            // Supabase SDK 会自动处理 code 交换 token
            // 我们只需要等待 onAuthStateChange 回调更新 session
            console.log('OAuth code received, waiting for session update...');
          }
        } catch (err) {
          console.error('Failed to parse deep link URL:', err);
        }
      }
    };

    // 监听初始 URL（如果 App 是通过深链启动的）
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // 监听后续的深链
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);
```

**关键点**:
- 使用 React Native `Linking` API 监听深链
- 处理 `partytix://auth-callback?code=...` 格式的回调
- Supabase SDK 自动处理 code 交换 token

---

## ⚙️ 配置要求

### Supabase 控制台配置

#### 1. 启用 Google Provider

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择项目
3. 进入 **Authentication** > **Providers**
4. 启用 **Google** Provider
5. 配置 Google OAuth Client ID 和 Secret

#### 2. 配置重定向 URL

进入 **Authentication** > **URL Configuration**，添加以下重定向 URL：

**Web 端**:
```
https://your-domain.com/auth/oauth-success
https://your-domain.com/auth/callback
```

**移动端**:
```
partytix://auth-callback
```

**开发环境**:
```
http://localhost:3000/auth/oauth-success
http://localhost:3000/auth/callback
```

### 移动端 app.json 配置

```json
{
  "expo": {
    "scheme": "partytix",
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your-anon-key"
    }
  }
}
```

### Google Cloud Console 配置

在 [Google Cloud Console](https://console.cloud.google.com) 中：

1. 创建 OAuth 2.0 客户端 ID
2. 配置授权重定向 URI：
   - Web: `https://your-project.supabase.co/auth/v1/callback`
   - 移动端: `partytix://auth-callback` (如果使用自定义 scheme)

---

## 🔄 数据流

### Web 端流程

```
1. 用户点击 "Continue with Google"
   ↓
2. 调用 loginWithGoogle()
   ↓
3. Supabase 生成 OAuth URL
   ↓
4. 浏览器跳转到 Google 登录页面
   ↓
5. 用户完成 Google 登录
   ↓
6. Google 重定向到 Supabase
   ↓
7. Supabase 重定向到 /auth/oauth-success?code=...
   ↓
8. 页面轮询检查用户状态
   ↓
9. 调用 handleAfterLogin() 处理登录后逻辑
   ↓
10. 重定向到目标页面
```

### 移动端流程

```
1. 用户点击 "Continue with Google"
   ↓
2. 调用 signInWithGoogle()
   ↓
3. Supabase 生成 OAuth URL
   ↓
4. 使用 expo-auth-session 打开系统浏览器
   ↓
5. 用户完成 Google 登录
   ↓
6. Google 重定向到 Supabase
   ↓
7. Supabase 重定向到 partytix://auth-callback?code=...
   ↓
8. 深链触发 App 的 Linking 监听器
   ↓
9. Supabase SDK 自动处理 code 交换 token
   ↓
10. onAuthStateChange 回调更新 session
   ↓
11. App 显示已登录状态（WebView）
```

### 数据库同步流程

```
1. Supabase Auth 创建 auth.users 记录
   ↓
2. 数据库触发器 handle_new_auth_user_to_users 触发
   ↓
3. 同步到 public.users 表
   ↓
4. /api/auth/after-login API 更新业务字段
   (name, auth_provider, registration_domain 等)
```

---

## 🔑 关键差异

| 特性 | Web 端 | 移动端 |
|------|--------|--------|
| **浏览器控制** | 自动跳转 | 手动控制（`skipBrowserRedirect: true`） |
| **回调方式** | HTTP 重定向 | 深链（Deep Link） |
| **回调 URL** | `/auth/oauth-success` | `partytix://auth-callback` |
| **Session 检测** | URL 参数 + 轮询 | `onAuthStateChange` 回调 |
| **浏览器类型** | 当前浏览器窗口 | 系统浏览器（非 WebView） |
| **配置来源** | 环境变量 | `app.json` extra 字段 |

### 为什么移动端使用系统浏览器？

- ✅ 避免 Google 的 "disallowed_useragent" 错误
- ✅ 更好的用户体验（使用系统浏览器）
- ✅ 支持已登录的 Google 账号快速授权

---

## 🧪 测试指南

### Web 端测试

1. **启动开发服务器**:
   ```bash
   npm run dev
   ```

2. **访问登录页面**:
   ```
   http://localhost:3000/auth/login
   ```

3. **点击 "Continue with Google"**:
   - 应该跳转到 Google 登录页面
   - 完成登录后应该重定向到 `/auth/oauth-success`
   - 然后自动跳转到目标页面

### 移动端测试

#### 使用 Expo Go（快速测试）

1. **启动开发服务器**:
   ```bash
   cd mobile
   npm start
   ```

2. **扫描二维码**:
   - 使用 Expo Go App 扫描
   - 注意：某些 OAuth 功能可能受限

#### 使用开发构建（完整测试）

1. **构建开发版本**:
   ```bash
   cd mobile
   eas build --platform android --profile development
   ```

2. **安装到设备**:
   - 下载 APK 并安装

3. **测试流程**:
   - 打开 App，看到原生登录页面
   - 点击 "Continue with Google"
   - 应该打开系统浏览器（不是 WebView）
   - 完成 Google 登录
   - 应该自动返回 App
   - 应该看到 WebView 主页面（已登录状态）

### 常见问题排查

#### 1. Web 端：OAuth 回调失败

**检查**:
- Supabase 控制台中的 Redirect URLs 配置
- 确保添加了 `http://localhost:3000/auth/oauth-success`（开发环境）
- 检查浏览器控制台错误

#### 2. 移动端：深链不工作

**检查**:
- `app.json` 中的 `scheme: "partytix"` 配置
- Supabase 控制台中的 Redirect URLs 是否包含 `partytix://auth-callback`
- 使用开发构建而不是 Expo Go（某些深链功能需要）

#### 3. Session 不持久化

**检查**:
- Web 端：检查浏览器 Cookie 设置
- 移动端：检查 `supabase.native.ts` 中的 `persistSession: true`

#### 4. "disallowed_useragent" 错误

**解决方案**:
- ✅ 移动端已解决：使用系统浏览器而不是 WebView
- Web 端：确保使用现代浏览器

---

## 📚 相关文档

- [移动端 Google 登录配置](./mobile/GOOGLE_AUTH_SETUP.md)
- [认证重构总结](./AUTH_REFACTOR_SUMMARY.md)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Expo AuthSession 文档](https://docs.expo.dev/versions/latest/sdk/auth-session/)

---

## 🔐 安全注意事项

1. **重定向 URL 验证**: Supabase 会验证重定向 URL，确保在控制台中正确配置
2. **HTTPS 要求**: 生产环境必须使用 HTTPS
3. **深链 Scheme**: 使用唯一的 scheme（如 `partytix`）避免冲突
4. **Token 存储**: Supabase SDK 自动安全存储 token，不要手动存储
5. **Session 刷新**: 启用 `autoRefreshToken` 自动刷新过期 token

---

**最后更新**: 2025-01-XX
**维护者**: PartyTix 开发团队

