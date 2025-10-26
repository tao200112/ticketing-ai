# 📋 部署检查清单

## 🎯 部署前准备

### ✅ 前端 Vercel 部署检查

#### 1. 代码检查
- [x] 前后端完全分离
- [x] 前端使用 API 客户端
- [x] 无直接数据库连接
- [x] 环境变量使用正确

#### 2. 配置文件
- [x] `next.config.js` 配置正确
- [x] `vercel.json` 配置完整
- [x] `package.json` 脚本正确

#### 3. 环境变量设置
在 Vercel Dashboard > Settings > Environment Variables 中设置：

```bash
# 必需的环境变量
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/v1
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
```

### ✅ 后端部署检查

#### 1. 选择部署平台
推荐顺序：
1. **Railway** (最简单)
2. **Render** (免费额度)
3. **Heroku** (稳定)
4. **DigitalOcean** (性能好)

#### 2. 环境变量配置
```bash
# 基础配置
NODE_ENV=production
PORT=3001

# 数据库
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# 支付
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS
CORS_ORIGIN=https://your-frontend-domain.vercel.app
CORS_CREDENTIALS=true

# 安全
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
```

## 🚀 部署步骤

### 步骤 1: 部署后端

#### Railway 部署 (推荐)
1. 访问 [Railway.app](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的仓库
5. 设置根目录为 `backend`
6. 配置环境变量
7. 等待部署完成

#### Render 部署
1. 访问 [Render.com](https://render.com)
2. 点击 "New +" > "Web Service"
3. 连接 GitHub 仓库
4. 设置：
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 配置环境变量
6. 点击 "Create Web Service"

### 步骤 2: 部署前端

#### Vercel 部署
1. 访问 [Vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 导入 GitHub 仓库
4. 设置：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (默认)
5. 配置环境变量
6. 点击 "Deploy"

### 步骤 3: 配置域名

#### 后端域名
- Railway: `https://your-app-name.railway.app`
- Render: `https://your-app-name.onrender.com`
- Heroku: `https://your-app-name.herokuapp.com`

#### 前端域名
- Vercel: `https://your-app-name.vercel.app`
- 自定义域名: `https://yourdomain.com`

## 🔧 部署后配置

### 1. 更新环境变量
```bash
# 前端环境变量
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/v1
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.vercel.app

# 后端环境变量
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 2. 配置 Stripe Webhook
1. 在 Stripe Dashboard 中创建 Webhook
2. 设置 Endpoint URL: `https://your-backend-domain.com/v1/webhooks/stripe`
3. 选择事件: `checkout.session.completed`
4. 复制 Webhook Secret 到后端环境变量

### 3. 配置 Supabase
1. 在 Supabase Dashboard 中获取项目 URL 和密钥
2. 配置 RLS 策略
3. 设置 CORS 允许前端域名

## 🧪 功能测试

### 1. 基础功能测试
```bash
# 测试后端健康检查
curl https://your-backend-domain.com/health

# 测试前端页面
curl https://your-frontend-domain.vercel.app

# 测试 API 集成
curl https://your-backend-domain.com/v1/events
```

### 2. 完整功能测试
1. 访问前端页面
2. 测试用户注册/登录
3. 测试活动浏览
4. 测试票务购买
5. 测试支付流程
6. 测试票务验证

## 🔍 故障排查

### 常见问题

#### 1. CORS 错误
```bash
# 检查后端 CORS 配置
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

#### 2. 环境变量未生效
- 检查变量名是否正确
- 确保重新部署了应用
- 检查变量值是否包含特殊字符

#### 3. 数据库连接失败
- 检查 Supabase URL 和密钥
- 确保 RLS 策略正确
- 检查网络连接

#### 4. 支付功能异常
- 检查 Stripe 密钥配置
- 确保 Webhook 配置正确
- 检查支付金额格式

## 📊 监控和维护

### 1. 健康检查
- 后端: `https://your-backend-domain.com/health`
- 前端: 访问首页检查加载

### 2. 日志监控
- Railway: 内置日志查看
- Render: 日志面板
- Vercel: 函数日志

### 3. 性能监控
- 使用 New Relic 或 DataDog
- 监控响应时间和错误率
- 设置告警通知

## 🎉 部署完成检查

- [ ] 后端服务正常运行
- [ ] 前端页面正常加载
- [ ] API 调用正常
- [ ] 用户认证功能正常
- [ ] 支付功能正常
- [ ] 票务功能正常
- [ ] 所有页面可访问
- [ ] 移动端适配正常
- [ ] 性能满足要求
- [ ] 安全配置正确

## 📞 技术支持

如果遇到问题：
1. 检查日志文件
2. 验证环境变量
3. 测试网络连接
4. 查看平台文档
5. 联系技术支持
