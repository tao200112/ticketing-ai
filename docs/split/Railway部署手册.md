# 🚀 Railway 后端部署手册

## 📋 部署概述

本手册将指导您完成 Partytix 后端服务在 Railway.app 平台的自动化部署。

### 🎯 部署目标
- **平台**: Railway.app
- **仓库**: ticketing-ai
- **后端目录**: backend/
- **前端**: 已部署在 Vercel，仅保留 NEXT_PUBLIC_API_URL 指向后端域名
- **部署方式**: 通过 GitHub 自动触发构建，无需手动点击 Deploy

## 🔧 配置文件说明

### railway.json
```json
{
  "build": {
    "rootDirectory": "backend"
  }
}
```

**说明**: Railway 会自动进入 `backend/` 目录进行构建和运行，无需手动指定。

## 📦 后端目录结构检查

### ✅ 必需文件
- [x] `backend/package.json` - 包含 start 脚本
- [x] `backend/server.js` - 主入口文件
- [x] `backend/env.railway.example` - 环境变量模板

### ✅ package.json 脚本
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  }
}
```

## 🔑 必填环境变量清单

在 Railway Dashboard > Variables 中设置以下环境变量：

### 基础配置
```bash
NODE_ENV=production
PORT=8080
```

### 数据库配置
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 认证配置
```bash
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```

### 支付配置
```bash
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### CORS 配置
```bash
CORS_ORIGIN=https://your-frontend-domain.vercel.app
CORS_CREDENTIALS=true
```

### 安全配置
```bash
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
```

### 速率限制
```bash
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
```

### 日志配置
```bash
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

### 监控配置
```bash
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## 🚀 部署步骤

### 1. 创建 Railway 项目
1. 访问 [Railway.app](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择仓库 `ticketing-ai`
5. Railway 会自动检测到 `railway.json` 并进入 `backend/` 目录

### 2. 配置环境变量
1. 进入项目 Dashboard
2. 点击 "Variables" 标签
3. 根据 `backend/env.railway.example` 设置所有必需变量
4. 特别注意设置正确的 `CORS_ORIGIN` 为您的 Vercel 前端域名

### 3. 等待自动部署
- Railway 检测到代码推送后会自动开始构建
- 构建完成后会自动启动服务
- 无需手动点击 Deploy 按钮

## ✅ 验证部署成功

### 1. 检查服务状态
在 Railway Dashboard 中：
- 查看 "Deployments" 标签确认部署成功
- 查看 "Logs" 标签确认输出 `Server running on port 8080`

### 2. 健康检查
访问以下端点确认服务正常：
```bash
# 基础健康检查
curl https://your-app-name.up.railway.app/health

# API 健康检查
curl https://your-app-name.up.railway.app/v1/health

# 获取活动列表
curl https://your-app-name.up.railway.app/v1/events
```

**期望响应**: HTTP 200 状态码

### 3. 前端配置更新
在 Vercel Dashboard 中更新环境变量：
```bash
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app/v1
```

## ⚠️ 重要注意事项

### 1. 禁用 Metal Build Environment
- Railway 默认使用 Metal Build Environment
- 对于 Node.js 应用，建议禁用以获得更好的性能
- 在项目设置中关闭 "Use Metal Build Environment"

### 2. 前后端分离变量说明
- **后端变量**: 在 Railway 中设置，用于后端服务
- **前端变量**: 在 Vercel 中设置，以 `NEXT_PUBLIC_` 开头
- **CORS 配置**: 确保 `CORS_ORIGIN` 指向正确的 Vercel 域名

### 3. 端口配置
- Railway 自动分配端口，通过 `PORT` 环境变量获取
- 应用应监听 `process.env.PORT || 8080`

### 4. 日志监控
- 在 Railway Dashboard 中查看实时日志
- 设置日志告警以便及时发现问题

## 🔧 故障排查

### 常见问题

#### 1. 构建失败
- 检查 `backend/package.json` 中的依赖
- 确认 Node.js 版本兼容性
- 查看构建日志中的错误信息

#### 2. 服务启动失败
- 检查环境变量是否正确设置
- 确认端口配置
- 查看服务日志

#### 3. CORS 错误
- 确认 `CORS_ORIGIN` 设置正确
- 检查前端域名是否匹配

#### 4. 数据库连接失败
- 验证 Supabase URL 和密钥
- 检查网络连接
- 确认 RLS 策略配置

## 📊 监控和维护

### 1. 性能监控
- 使用 Railway 内置监控
- 设置告警阈值
- 定期检查资源使用情况

### 2. 日志管理
- 定期查看应用日志
- 设置日志轮转
- 配置日志告警

### 3. 安全维护
- 定期更新依赖
- 轮换密钥
- 监控异常访问

## 🎉 部署完成

部署成功后，您将获得：
- 后端 API 服务正常运行
- 自动 HTTPS 证书
- 全球 CDN 加速
- 自动扩缩容
- 实时监控和日志

**下一步**: 更新 Vercel 前端环境变量，完成前后端集成！
