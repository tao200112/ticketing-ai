# Expo 快速开始指南

## 🚀 5 分钟快速开始

### 1. 安装依赖

```bash
cd mobile
npm install
```

### 2. 启动开发服务器

```bash
npm start
```

或者从项目根目录：

```bash
npm run dev:mobile
```

### 3. 在设备上运行

**选项 A: 使用 Expo Go（最简单）**

1. 在手机上安装 [Expo Go](https://expo.dev/client)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. 扫描终端中显示的二维码
   - iOS: 使用相机 App 扫描
   - Android: 在 Expo Go App 内扫描

**选项 B: 使用模拟器**

```bash
# iOS 模拟器（需要 macOS）
npm run ios

# Android 模拟器
npm run android

# Web 浏览器
npm run web
```

## 📝 常用命令

```bash
# 启动开发服务器
npm start

# 清除缓存并启动
npx expo start --clear

# 构建预览版本（Android）
eas build --platform android --profile preview

# 构建预览版本（iOS）
eas build --platform ios --profile preview
```

## ⚠️ 重要提示

1. **首次使用**: 确保手机和电脑在同一 Wi-Fi 网络
2. **网络问题**: 如果无法连接，按 `s` 切换到隧道模式
3. **Google 登录**: 需要构建开发版本才能测试（Expo Go 可能不支持）

## 📚 更多信息

查看 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 获取完整开发指南。

