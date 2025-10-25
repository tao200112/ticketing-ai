# Stripe支付配置指南

## 🎯 概述

您的应用已经有完整的Stripe集成，包括：
- ✅ 动态价格配置（在活动创建页面）
- ✅ Stripe Webhook处理
- ✅ 票务生成和验证
- ✅ 支付完成处理

## 🔧 配置步骤

### 1. 获取Stripe密钥

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 登录您的Stripe账户
3. 在左侧菜单选择 "Developers" > "API keys"
4. 复制以下密钥：

**测试环境密钥：**
- `Publishable key` (pk_test_...)
- `Secret key` (sk_test_...)

**Webhook密钥：**
1. 在左侧菜单选择 "Developers" > "Webhooks"
2. 点击 "Add endpoint"
3. 设置Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. 选择事件: `checkout.session.completed`
5. 复制Signing secret (whsec_...)

### 2. 配置环境变量

在 `.env.local` 文件中更新Stripe配置：

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. 测试配置

运行测试脚本验证配置：

```bash
node check-stripe-config.js
```

## 🚀 功能特性

### 动态价格配置
- **位置**: `/merchant/events/new` (步骤3)
- **功能**: 商家可以配置多个票种和价格
- **字段**: 票种名称、价格(美分)、库存、用户限购

### 支付流程
1. **票务选择**: 用户选择票种和数量
2. **支付跳转**: 跳转到Stripe Checkout
3. **支付完成**: Webhook处理支付结果
4. **票务生成**: 自动生成票务和二维码

### Webhook处理
- **事件**: `checkout.session.completed`
- **功能**: 生成票务、更新库存、发送确认
- **端点**: `/api/stripe/webhook`

## 🧪 测试流程

### 1. 创建测试活动
1. 访问 `/merchant/events/new`
2. 填写活动信息
3. 配置票种和价格
4. 发布活动

### 2. 测试购买流程
1. 访问活动页面
2. 选择票种和数量
3. 填写用户信息
4. 点击购买按钮
5. 跳转到Stripe支付页面

### 3. 测试支付完成
1. 使用测试卡号: `4242 4242 4242 4242`
2. 任意未来日期和CVC
3. 完成支付
4. 验证票务生成

## 🔍 故障排除

### 常见问题

1. **支付跳转失败**
   - 检查Stripe密钥配置
   - 验证环境变量加载
   - 查看控制台错误

2. **Webhook处理失败**
   - 检查Webhook密钥
   - 验证端点URL
   - 查看服务器日志

3. **票务生成失败**
   - 检查数据库连接
   - 验证用户认证
   - 查看错误日志

### 调试工具

```bash
# 检查Stripe配置
node check-stripe-config.js

# 测试支付API
node test-stripe-config.js

# 启动Stripe CLI (本地测试)
npm run stripe:listen
```

## 📊 当前状态

- **动态价格**: ✅ 已实现
- **支付跳转**: ⚠️ 需要配置Stripe密钥
- **Webhook处理**: ✅ 已实现
- **票务生成**: ✅ 已实现

## 🎯 下一步

1. **配置Stripe密钥** - 按照上述步骤配置真实密钥
2. **测试支付流程** - 验证完整购买流程
3. **部署Webhook** - 在生产环境配置Webhook端点

配置完成后，您的票务系统将完全正常工作！
