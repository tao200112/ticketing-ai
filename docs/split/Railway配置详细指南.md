# Railway 后端配置详细指南

## 🚨 当前问题
Railway 部署的是前端 Next.js 应用，而不是后端 Express 服务。

## 🔧 解决方案

### 方法 1：使用 railway.json 配置文件

Railway 应该会自动识别项目根目录的 `railway.json` 文件。

**检查步骤：**
1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 找到 `ticketing-ai` 项目
3. 进入 **Settings** 或 **Configuration**
4. 查看是否有 **Build Settings** 或 **Deploy Settings**
5. 确认 `railway.json` 被正确识别

### 方法 2：手动设置构建命令

如果 `railway.json` 不被识别，可以手动设置：

1. 进入项目 **Settings**
2. 找到 **Build & Deploy** 或 **Deployment** 部分
3. 设置以下配置：
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Working Directory**: `backend`

### 方法 3：使用 Railway CLI

如果 Web 界面没有选项，可以使用 Railway CLI：

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 连接到项目
railway link

# 设置工作目录
railway service

# 设置环境变量
railway variables set NODE_ENV=production
railway variables set PORT=8080
# ... 其他环境变量

# 重新部署
railway up
```

### 方法 4：重新创建项目

如果以上方法都不工作：

1. **删除当前项目**
2. **创建新项目**
3. **选择 "Deploy from GitHub repo"**
4. **选择 `ticketing-ai` 仓库**
5. **在项目设置中**：
   - 设置 **Source Directory** 为 `backend`
   - 或者设置 **Build Command** 为 `cd backend && npm install`
   - 设置 **Start Command** 为 `cd backend && npm start`

## 📋 必需的环境变量

在 Railway 项目设置中添加以下环境变量：

```
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
CORS_ORIGIN=https://your-frontend-domain.vercel.app
CORS_CREDENTIALS=true
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## 🧪 验证部署

部署完成后，测试以下端点：

- `https://your-project.up.railway.app/health` - 应该返回 JSON
- `https://your-project.up.railway.app/v1/health` - 应该返回 JSON
- `https://your-project.up.railway.app/v1/events` - 应该返回活动列表

## 🔍 故障排除

### 如果仍然部署前端：
1. 检查 `railway.json` 是否在项目根目录
2. 确认 `backend/package.json` 存在且正确
3. 检查 Railway 日志中的构建信息
4. 尝试使用 Railway CLI 重新部署

### 如果环境变量问题：
1. 确认所有必需的环境变量都已设置
2. 检查变量名是否正确（区分大小写）
3. 确认 Supabase 和 Stripe 密钥有效

### 如果端口问题：
1. 确认 PORT 环境变量设置为 8080
2. 检查 `backend/server.js` 中的端口配置
3. 确认 Railway 分配的端口正确

## 📞 需要帮助？

如果以上方法都不工作，请：
1. 截图 Railway Dashboard 的设置页面
2. 查看 Railway 的构建日志
3. 确认项目结构是否正确
