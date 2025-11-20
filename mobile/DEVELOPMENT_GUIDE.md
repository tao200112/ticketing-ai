# Expo 开发指南

本指南将帮助你开始开发 PartyTix 移动应用。

## 📋 目录

1. [环境准备](#环境准备)
2. [安装依赖](#安装依赖)
3. [启动开发服务器](#启动开发服务器)
4. [在设备上运行](#在设备上运行)
5. [开发工作流](#开发工作流)
6. [调试技巧](#调试技巧)
7. [构建应用](#构建应用)
8. [常见问题](#常见问题)

## 🛠️ 环境准备

### 必需工具

1. **Node.js** (推荐 v18 或更高版本)
   ```bash
   node --version
   ```

2. **npm** 或 **yarn**
   ```bash
   npm --version
   ```

3. **Expo CLI** (全局安装，可选)
   ```bash
   npm install -g expo-cli
   ```
   或者使用 npx（推荐，无需全局安装）

### 移动设备开发选项

#### 选项 1: 使用 Expo Go（推荐用于快速开发）

- **iOS**: 从 App Store 安装 [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: 从 Google Play 安装 [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

#### 选项 2: 使用模拟器/仿真器

- **iOS 模拟器** (仅 macOS):
  - 需要安装 [Xcode](https://developer.apple.com/xcode/)
  - 从 App Store 安装 Xcode
  - 打开 Xcode > Preferences > Components 安装 iOS 模拟器

- **Android 模拟器**:
  - 需要安装 [Android Studio](https://developer.android.com/studio)
  - 安装 Android SDK 和模拟器
  - 配置环境变量（可选）

#### 选项 3: 使用真机（需要构建开发版本）

- 使用 EAS Build 构建开发版本
- 安装到真机进行测试

## 📦 安装依赖

1. **进入 mobile 目录**:
   ```bash
   cd mobile
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **验证安装**:
   ```bash
   npx expo --version
   ```

## 🚀 启动开发服务器

### 基本启动

```bash
cd mobile
npm start
# 或
npx expo start
```

这会启动 Expo 开发服务器，并显示一个二维码和菜单。

### 启动选项

```bash
# 启动并自动打开 iOS 模拟器（需要 macOS）
npm run ios

# 启动并自动打开 Android 模拟器
npm run android

# 启动 Web 版本
npm run web
```

### 开发服务器菜单

启动后，你可以使用以下快捷键：

- `i` - 在 iOS 模拟器中打开（需要 macOS）
- `a` - 在 Android 模拟器中打开
- `w` - 在 Web 浏览器中打开
- `r` - 重新加载应用
- `m` - 切换菜单
- `j` - 打开调试器
- `c` - 清除缓存并重新启动

## 📱 在设备上运行

### 使用 Expo Go（最简单）

1. **启动开发服务器**:
   ```bash
   cd mobile
   npm start
   ```

2. **扫描二维码**:
   - **iOS**: 使用相机 App 扫描二维码，会自动打开 Expo Go
   - **Android**: 使用 Expo Go App 内的扫描功能

3. **连接同一网络**:
   - 确保手机和电脑在同一 Wi-Fi 网络
   - 如果无法连接，可以按 `s` 切换到隧道模式（需要 Expo 账号）

### 使用开发构建（推荐用于生产前测试）

开发构建允许你测试原生功能，如 Google 登录等。

1. **安装 EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **登录 Expo 账号**:
   ```bash
   eas login
   ```

3. **构建开发版本**:
   ```bash
   # Android
   eas build --platform android --profile development

   # iOS (需要 Apple Developer 账号)
   eas build --platform ios --profile development
   ```

4. **安装到设备**:
   - 构建完成后，下载 APK/IPA
   - 安装到设备
   - 使用 `npx expo start --dev-client` 启动开发服务器

## 💻 开发工作流

### 项目结构

```
mobile/
├── App.tsx                 # 主应用入口
├── app.json                # Expo 配置
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
├── assets/                 # 静态资源（图标、启动画面等）
├── context/                # React Context
│   └── AuthContext.tsx     # 认证上下文
├── lib/                    # 工具库
│   ├── auth.ts            # 认证函数
│   └── supabase.native.ts # Supabase 客户端
├── screens/                # 页面组件
│   ├── LoginScreen.tsx
│   └── ForgotPasswordScreen.tsx
└── scripts/                # 构建脚本
    └── generate-assets.js
```

### 热重载

Expo 支持热重载（Hot Reload）和快速刷新（Fast Refresh）：
- 修改代码后，应用会自动更新
- 保存文件即可看到更改

### 添加新依赖

```bash
cd mobile
npm install <package-name>
```

**注意**: 某些原生模块可能需要重新构建应用。如果使用 Expo Go，确保该模块在 [Expo 兼容列表](https://docs.expo.dev/bare/installing-unimodules/) 中。

### 使用 TypeScript

项目已配置 TypeScript。创建新文件时使用 `.tsx` 或 `.ts` 扩展名。

## 🐛 调试技巧

### 1. 使用 React Native Debugger

```bash
# 在开发服务器中按 'j' 打开调试器
# 或访问 http://localhost:19000/debugger-ui
```

### 2. 查看日志

- **终端日志**: 开发服务器终端会显示所有 console.log
- **设备日志**: 
  - iOS: 使用 Xcode Console 或 `xcrun simctl spawn booted log stream`
  - Android: 使用 `adb logcat` 或 Android Studio Logcat

### 3. 使用 Flipper（可选）

Flipper 是一个强大的调试工具：
```bash
# 安装 Flipper
# 然后启动应用，Flipper 会自动连接
```

### 4. 网络调试

- 使用 Chrome DevTools 的网络标签
- 或使用 React Native Debugger 的网络面板

### 5. 清除缓存

如果遇到奇怪的问题，尝试清除缓存：

```bash
# 清除 Metro bundler 缓存
npx expo start --clear

# 清除所有缓存（包括 node_modules）
rm -rf node_modules
npm install
npx expo start --clear
```

## 🏗️ 构建应用

### 使用 EAS Build（推荐）

EAS Build 是 Expo 的云构建服务，支持构建 iOS 和 Android 应用。

1. **配置 EAS**:
   ```bash
   eas build:configure
   ```

2. **构建预览版本**:
   ```bash
   # Android APK
   eas build --platform android --profile preview

   # iOS (需要 Apple Developer 账号)
   eas build --platform ios --profile preview
   ```

3. **构建生产版本**:
   ```bash
   # Android AAB (用于 Google Play)
   eas build --platform android --profile production

   # iOS (用于 App Store)
   eas build --platform ios --profile production
   ```

### 构建配置

构建配置在 `eas.json` 中：

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### 本地构建（高级）

如果你想在本地构建：

```bash
# 需要安装 Android SDK 和 Xcode
eas build --platform android --local
eas build --platform ios --local
```

## ❓ 常见问题

### 1. 无法连接到开发服务器

**解决方案**:
- 确保手机和电脑在同一 Wi-Fi 网络
- 尝试使用隧道模式：按 `s` 切换到隧道
- 检查防火墙设置

### 2. 模块未找到错误

**解决方案**:
```bash
# 清除缓存并重新安装
rm -rf node_modules
npm install
npx expo start --clear
```

### 3. iOS 构建失败

**可能原因**:
- 缺少 Apple Developer 账号
- 证书配置问题
- Xcode 版本不兼容

**解决方案**:
- 检查 `eas.json` 配置
- 运行 `eas build:configure` 重新配置
- 查看 [EAS Build 文档](https://docs.expo.dev/build/introduction/)

### 4. Android 构建失败

**可能原因**:
- Java 版本不兼容
- Android SDK 配置问题

**解决方案**:
- 确保使用 Java 17 或更高版本
- 检查 Android SDK 路径配置

### 5. 深链不工作

**检查清单**:
- ✅ `app.json` 中配置了 `scheme: "partytix"`
- ✅ Supabase 控制台中添加了重定向 URL: `partytix://auth-callback`
- ✅ 使用开发构建而不是 Expo Go（某些深链功能需要）

### 6. Google 登录不工作

**检查清单**:
- ✅ Supabase 中启用了 Google Provider
- ✅ 配置了正确的 OAuth Client ID 和 Secret
- ✅ 添加了正确的重定向 URL
- ✅ 使用开发构建（Expo Go 可能不支持某些 OAuth 流程）

## 📚 有用资源

- [Expo 文档](https://docs.expo.dev/)
- [React Native 文档](https://reactnative.dev/)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [Supabase React Native 指南](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

## 🔄 下一步

1. ✅ 完成环境设置
2. ✅ 启动开发服务器
3. ✅ 在设备上测试
4. 📝 开始开发新功能
5. 🧪 编写测试
6. 🚀 构建和发布

## 💡 开发提示

- **使用 TypeScript**: 项目已配置 TypeScript，利用类型检查提高代码质量
- **遵循代码规范**: 使用 ESLint 和 Prettier（如果配置了）
- **测试不同设备**: 在 iOS 和 Android 上都测试你的更改
- **版本控制**: 定期提交代码，使用有意义的提交信息
- **文档更新**: 添加新功能时更新相关文档

---

**需要帮助？** 查看项目 README.md 或联系团队。

