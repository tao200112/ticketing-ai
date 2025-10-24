# Stripe CLI 使用指南

## 🎉 安装完成！

Stripe CLI 已成功安装到您的系统中。

## 📍 安装位置
- **路径**: `C:\Users\a2432\ticketing-ai\stripe-cli\stripe.exe`
- **版本**: 1.21.8

## 🚀 使用方法

### 1. 基本命令
```bash
# 查看版本
.\stripe-cli\stripe.exe --version

# 查看帮助
.\stripe-cli\stripe.exe --help

# 登录到 Stripe 账户
.\stripe-cli\stripe.exe login
```

### 2. Webhook 监听
```bash
# 监听所有 webhook 事件
.\stripe-cli\stripe.exe listen

# 监听并转发到您的应用
.\stripe-cli\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. 测试支付
```bash
# 触发测试 webhook 事件
.\stripe-cli\stripe.exe trigger payment_intent.succeeded

# 触发支付失败事件
.\stripe-cli\stripe.exe trigger payment_intent.payment_failed
```

## 🔧 配置您的项目

### 1. 登录 Stripe
```bash
.\stripe-cli\stripe.exe login
```
这将打开浏览器让您登录到 Stripe Dashboard。

### 2. 监听 Webhook（用于开发）
```bash
.\stripe-cli\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. 在您的应用中测试支付
1. 启动您的 Next.js 应用：`npm run dev`
2. 启动 Stripe CLI 监听：`.\stripe-cli\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook`
3. 在应用中创建测试支付

## 📋 常用命令总结

| 命令 | 描述 |
|------|------|
| `stripe login` | 登录到 Stripe 账户 |
| `stripe listen` | 监听 webhook 事件 |
| `stripe trigger` | 触发测试事件 |
| `stripe logs` | 查看 API 请求日志 |
| `stripe open` | 打开 Stripe Dashboard |

## 🎯 与您的票务系统集成

您的项目已经配置了 Stripe 支付功能：

1. **支付处理**: `app/api/checkout_sessions/route.js`
2. **Webhook 处理**: `app/api/stripe/webhook/route.js`
3. **环境变量**: 需要配置 `STRIPE_SECRET_KEY` 和 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 🔍 故障排除

### 如果命令不工作
```bash
# 使用完整路径
.\stripe-cli\stripe.exe --version

# 或者添加到 PATH 环境变量
```

### 如果 webhook 不工作
1. 确保应用正在运行：`npm run dev`
2. 确保 webhook 端点正确：`/api/stripe/webhook`
3. 检查 Stripe Dashboard 中的 webhook 配置

## 🎉 下一步

1. 运行 `.\stripe-cli\stripe.exe login` 登录
2. 配置您的 Stripe API 密钥
3. 开始测试支付功能！

---

**注意**: 每次使用 Stripe CLI 时，请使用完整路径 `.\stripe-cli\stripe.exe` 或将其添加到系统 PATH 中。
