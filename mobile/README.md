# PartyTix Mobile App

这是 PartyTix 票务系统的移动客户端 App（仅面向普通用户）。

## 项目简介

This is the mobile client (user-facing only) for PartyTix ticketing system. The current version is a WebView wrapper that loads the web application. Merchant and admin features are only available on the web version.

当前版本是一个 WebView 套壳应用，加载用户端网站。商家和管理员功能仅在网页版可用。

## 技术栈

- Expo ~54.0
- React Native 0.81.5
- TypeScript
- react-native-webview

## 安装和运行

### 1. 安装依赖

```bash
cd mobile
npm install
```

### 2. 启动开发服务器

```bash
npx expo start
```

### 3. 在设备上预览

启动后，你可以选择：

- **iOS 模拟器**：按 `i` 键（需要 macOS 和 Xcode）
- **Android 模拟器**：按 `a` 键（需要 Android Studio）
- **真机**：
  - iOS：使用 Expo Go App 扫描二维码
  - Android：使用 Expo Go App 扫描二维码

### 4. 其他命令

```bash
# 直接启动 Android
npm run android

# 直接启动 iOS（需要 macOS）
npm run ios

# 启动 Web 版本
npm run web
```

## 当前功能

- ✅ WebView 套壳，加载用户端网站
- ✅ 拦截并阻止访问 `/merchant` 和 `/admin` 路径
- ✅ 支持 Supabase Auth（通过 WebView cookies）

## 未来扩展计划

以下功能计划在未来版本中实现为原生页面：

- 登录/注册/忘记密码（使用 Supabase RN SDK）
- 我的票列表/订单列表（调用现有 API）
- 单张票详情 + QRCode 展示（使用 react-native-qrcode-svg）

## 配置说明

### Web App URL

当前使用的 Web App URL 在 `App.tsx` 中配置：

```typescript
const WEB_APP_URL = 'https://ticketing-ai-six.vercel.app';
```

将来可以改为正式域名（如 `https://partytix.com`）。

### Bundle Identifier / Package Name

当前配置：
- iOS: `com.partytix.client`
- Android: `com.partytix.client`

**注意**：发布到 App Store / Google Play 前，需要将这些值改为正式的应用包名。

## 项目结构

```
mobile/
├── App.tsx              # 主入口，包含 WebView 实现
├── app.json             # Expo 配置文件
├── package.json         # 依赖配置
└── README.md           # 本文件
```

## 注意事项

- 当前版本只是 WebView 套壳，商家/管理员功能仅在网页端可用
- 确保设备有网络连接，WebView 需要加载远程 URL
- 开发阶段使用 `https://ticketing-ai-six.vercel.app`，生产环境需要改为正式域名

