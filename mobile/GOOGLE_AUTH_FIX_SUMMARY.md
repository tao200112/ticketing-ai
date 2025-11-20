# Google 登录修复总结

## 修复日期
2025-01-XX

## 修复内容

### 1. 修复 `AuthSession.startAsync is not a function` 错误

**问题**: 在 `expo-auth-session` v6.1.5 中，`AuthSession.startAsync` 方法已被移除。

**解决方案**: 使用 `WebBrowser.openAuthSessionAsync()` 替代，功能完全相同，都是打开系统浏览器进行 OAuth 认证。

**修改文件**: `mobile/lib/auth.ts`

```typescript
// 修改前（会报错）
const result = await AuthSession.startAsync({
  authUrl: data.url,
  returnUrl: redirectUri,
});

// 修改后（正确）
const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
```

### 2. 重命名函数以明确用途

**修改**: 将 `signInWithGoogle()` 重命名为 `signInWithGoogleNative()`，明确这是移动端原生实现。

**修改文件**:
- `mobile/lib/auth.ts` - 函数定义
- `mobile/context/AuthContext.tsx` - Context 接口和实现
- `mobile/screens/LoginScreen.tsx` - 使用处

### 3. 完善深链处理逻辑

**改进**: 在 `mobile/App.tsx` 中完善深链处理：
- 添加详细的日志输出
- 改进错误处理
- 添加初始 URL 检查的错误处理

### 4. 增强日志输出

**改进**: 在所有关键步骤添加日志：
- OAuth 流程的每个步骤
- 深链接收和处理
- 认证状态变化
- 错误信息

### 5. 改进错误处理

**改进**:
- 所有错误都在控制台输出详细信息
- 用户友好的错误提示（通过 Alert）
- 不吞掉错误，确保可调试性

## 技术细节

### 导入方式

所有文件统一使用命名空间导入：

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
```

**不允许使用**:
- `import AuthSession from 'expo-auth-session'` ❌
- `import { AuthSession } from 'expo-auth-session'` ❌

### Supabase 客户端配置

`mobile/lib/supabase.native.ts` 配置正确：
- `persistSession: true` - 持久化 session
- `autoRefreshToken: true` - 自动刷新 token
- `detectSessionInUrl: false` - React Native 不需要检测 URL

### 深链 Scheme

在 `mobile/app.json` 中配置：
```json
{
  "expo": {
    "scheme": "partytix"
  }
}
```

深链格式: `partytix://auth-callback?code=...`

### OAuth 流程

1. 用户点击 "Continue with Google"
2. 调用 `signInWithGoogleNative()`
3. 生成重定向 URI: `partytix://auth-callback`
4. 调用 Supabase `signInWithOAuth()` 获取 OAuth URL
5. 使用 `WebBrowser.openAuthSessionAsync()` 打开系统浏览器
6. 用户在系统浏览器中完成 Google 登录
7. Google 重定向到 Supabase，Supabase 重定向到 `partytix://auth-callback?code=...`
8. 深链触发 App 的 `Linking` 监听器
9. Supabase SDK 自动处理 code 交换 token
10. `onAuthStateChange` 回调更新 session
11. App 显示已登录状态

## 测试检查清单

- [x] 修复 `AuthSession.startAsync is not a function` 错误
- [x] 使用系统浏览器（不是 WebView）
- [x] 深链回调正确处理
- [x] Session 自动更新
- [x] 错误处理和日志完善
- [x] 所有函数命名清晰

## 注意事项

1. **WebBrowser.openAuthSessionAsync vs AuthSession.startAsync**
   - 在 `expo-auth-session` v6 中，`startAsync` 已被移除
   - `WebBrowser.openAuthSessionAsync` 是推荐的替代方法
   - 功能完全相同，都是打开系统浏览器

2. **深链处理**
   - Supabase SDK 会自动处理 code 交换 token
   - 不需要手动解析 code 或交换 token
   - 只需等待 `onAuthStateChange` 回调

3. **Session 持久化**
   - Supabase SDK 自动处理 session 持久化
   - 不需要手动存储 token
   - App 重启后 session 会自动恢复

## 相关文件

- `mobile/lib/auth.ts` - Google 登录核心逻辑
- `mobile/lib/supabase.native.ts` - Supabase 客户端配置
- `mobile/context/AuthContext.tsx` - 认证上下文
- `mobile/screens/LoginScreen.tsx` - 登录页面
- `mobile/App.tsx` - 深链处理
- `mobile/app.json` - Expo 配置

## 后续优化建议

1. 考虑添加重试机制（如果 OAuth 失败）
2. 考虑添加加载状态指示（在等待深链回调时）
3. 考虑添加超时处理（如果深链回调超时）

