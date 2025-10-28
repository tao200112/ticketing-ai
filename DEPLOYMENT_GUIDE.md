# PartyTix 部署指南

## 📋 概述

本指南将帮助您将 PartyTix 应用程序部署到生产环境：
- **前端**: Vercel (Next.js)
- **后端**: Railway (Node.js/Express)
- **数据库**: Supabase
- **支付**: Stripe

## 🚀 快速开始

### 1. 环境准备

确保您有以下账户：
- [Vercel](https://vercel.com) - 前端部署
- [Railway](https://railway.app) - 后端部署
- [Supabase](https://supabase.com) - 数据库
- [Stripe](https://stripe.com) - 支付处理

### 2. 数据库设置 (Supabase)

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 在 SQL Editor 中执行 `supabase/migrations/partytix_mvp.sql`
4. 记录以下信息：
   - Project URL
   - Anon Key
   - Service Role Key

### 3. 支付设置 (Stripe)

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 获取以下密钥：
   - Publishable Key (pk_test_... 或 pk_live_...)
   - Secret Key (sk_test_... 或 sk_live_...)
   - Webhook Secret (whsec_...)

## 🔧 环境变量配置

### 前端环境变量 (Vercel)

在 Vercel Dashboard > Project Settings > Environment Variables 中设置：

```bash
# 基础配置
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# 数据库配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 支付配置
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key

# API 配置
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/v1
```

### 后端环境变量 (Railway)

在 Railway Dashboard > Variables 中设置：

```bash
# 基础配置
NODE_ENV=production
PORT=8080

# 数据库配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12

# 支付配置
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS 配置
CORS_ORIGIN=https://your-app.vercel.app
CORS_CREDENTIALS=true

# 安全配置
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# 速率限制
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# 日志配置
LOG_LEVEL=info
MONITORING_ENABLED=true
```

## 🎯 部署步骤

### 步骤 1: 部署后端 (Railway)

1. **连接 GitHub 仓库**
   ```bash
   # 在 Railway Dashboard 中
   # 1. 点击 "New Project"
   # 2. 选择 "Deploy from GitHub repo"
   # 3. 选择您的仓库
   ```

2. **配置项目设置**
   - Root Directory: `backend`
   - Build Command: `npm ci --only=production`
   - Start Command: `npm start`

3. **设置环境变量**
   - 复制 `backend/env.railway.example` 中的所有变量
   - 在 Railway Dashboard 中设置实际值

4. **部署**
   - Railway 会自动检测到 `railway.json` 和 `railway.toml` 配置
   - 点击 "Deploy" 开始部署

### 步骤 2: 部署前端 (Vercel)

1. **连接 GitHub 仓库**
   ```bash
   # 在 Vercel Dashboard 中
   # 1. 点击 "New Project"
   # 2. 导入您的 GitHub 仓库
   # 3. 选择项目根目录
   ```

2. **配置构建设置**
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **设置环境变量**
   - 复制 `env.example` 中的所有变量
   - 在 Vercel Dashboard 中设置实际值
   - 确保 `NEXT_PUBLIC_API_URL` 指向您的 Railway 后端 URL

4. **部署**
   - 点击 "Deploy" 开始部署
   - Vercel 会自动检测到 `vercel.json` 配置

### 步骤 3: 配置 Stripe Webhooks

1. **在 Stripe Dashboard 中设置 Webhook**
   ```
   Endpoint URL: https://your-backend.railway.app/v1/webhooks/stripe
   Events: checkout.session.completed
   ```

2. **测试 Webhook**
   ```bash
   # 使用 Stripe CLI 测试
   stripe listen --forward-to https://your-backend.railway.app/v1/webhooks/stripe
   ```

### 步骤 4: 更新 CORS 设置

1. **更新后端 CORS 配置**
   - 在 Railway 环境变量中设置 `CORS_ORIGIN` 为您的 Vercel 域名

2. **更新前端 API 配置**
   - 确保 `NEXT_PUBLIC_API_URL` 指向正确的 Railway 后端 URL

## 🔍 验证部署

### 1. 检查后端健康状态
```bash
curl https://your-backend.railway.app/health
```

### 2. 检查前端部署
访问您的 Vercel 域名，确保页面正常加载

### 3. 测试 API 连接
```bash
curl https://your-backend.railway.app/v1/events
```

### 4. 测试支付流程
1. 创建测试活动
2. 尝试购买票务
3. 检查 Stripe Dashboard 中的支付记录

## 🛠️ 故障排除

### 常见问题

1. **CORS 错误**
   - 检查 `CORS_ORIGIN` 环境变量是否正确
   - 确保前后端域名匹配

2. **数据库连接失败**
   - 验证 Supabase URL 和密钥
   - 检查数据库表是否正确创建

3. **支付失败**
   - 验证 Stripe 密钥是否正确
   - 检查 Webhook 配置

4. **构建失败**
   - 检查 `package.json` 依赖
   - 查看构建日志中的具体错误

### 日志查看

- **Vercel**: Dashboard > Functions > View Function Logs
- **Railway**: Dashboard > Deployments > View Logs
- **Supabase**: Dashboard > Logs

## 📊 监控和维护

### 1. 性能监控
- 使用 Vercel Analytics 监控前端性能
- 使用 Railway Metrics 监控后端性能

### 2. 错误监控
- 配置 Sentry 或其他错误监控服务
- 设置告警通知

### 3. 数据库监控
- 使用 Supabase Dashboard 监控数据库性能
- 定期备份数据

## 🔐 安全最佳实践

1. **环境变量安全**
   - 不要在代码中硬编码敏感信息
   - 定期轮换密钥

2. **API 安全**
   - 使用 HTTPS
   - 实施速率限制
   - 验证输入数据

3. **数据库安全**
   - 启用 RLS (Row Level Security)
   - 定期更新 Supabase

## 📈 扩展性考虑

1. **水平扩展**
   - Railway 支持自动扩展
   - Vercel 支持边缘计算

2. **缓存策略**
   - 使用 Redis 缓存频繁查询
   - 实施 CDN 缓存

3. **数据库优化**
   - 添加适当的索引
   - 定期清理旧数据

## 🆘 支持

如果遇到问题，请检查：
1. 部署日志
2. 环境变量配置
3. 网络连接
4. 服务状态

---

**注意**: 请确保在生产环境中使用强密码和安全的密钥，并定期更新依赖项。
