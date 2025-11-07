# merchantID is required 错误修复指南

## 问题描述

前端报错：`container.js:2 Uncaught (in promise) Error: merchantID is required`

这个错误来自打包后的 `container.js` 文件，可能是某个第三方库或组件在初始化时要求 `merchantID`。

## 可能的原因

1. **环境变量缺失**：`NEXT_PUBLIC_MERCHANT_ID` 未设置
2. **第三方库初始化**：某个支付或商家相关的库需要 merchantID
3. **全局组件初始化**：某个全局组件在页面加载时检查 merchantID

## 解决方案

### 方案 1: 设置环境变量（推荐）

在 Vercel 环境变量中设置：

```bash
NEXT_PUBLIC_MERCHANT_ID=default-merchant-id
```

或者在本地 `.env.local` 文件中：

```bash
NEXT_PUBLIC_MERCHANT_ID=default-merchant-id
```

### 方案 2: 添加错误处理

如果错误不影响核心功能，可以在 Sentry 配置中忽略此错误：

```javascript
// sentry.client.config.js
ignoreErrors: [
  'merchantID is required',
  'ResizeObserver loop limit exceeded',
  'Non-Error promise rejection captured',
],
```

### 方案 3: 条件初始化

如果某个组件需要 merchantID，可以添加条件检查：

```javascript
// 在组件初始化时检查
if (process.env.NEXT_PUBLIC_MERCHANT_ID) {
  // 初始化需要 merchantID 的组件
} else {
  console.warn('NEXT_PUBLIC_MERCHANT_ID not set, skipping merchant-specific initialization');
}
```

## 诊断步骤

1. **检查环境变量**：
   ```bash
   # 在浏览器控制台
   console.log('MERCHANT_ID:', process.env.NEXT_PUBLIC_MERCHANT_ID);
   ```

2. **检查错误堆栈**：
   - 打开浏览器 DevTools
   - 查看 Console 中的完整错误堆栈
   - 找到 `container.js` 的来源

3. **检查网络请求**：
   - 查看 Network 标签
   - 检查是否有请求失败或返回错误

## 临时解决方案

如果错误不影响功能，可以暂时忽略：

1. 在 Sentry 配置中添加错误过滤
2. 在全局错误处理中捕获并忽略此错误

## 长期解决方案

1. **识别错误来源**：确定是哪个库或组件需要 merchantID
2. **正确配置**：设置正确的环境变量
3. **条件初始化**：只在需要时初始化相关组件

