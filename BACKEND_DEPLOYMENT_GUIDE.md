# 🚀 后端部署指南

## 📋 部署选项

### 1. **Railway** (推荐)
- **优点**: 简单易用，自动部署，内置数据库
- **价格**: 免费额度充足，按使用量付费
- **适合**: 中小型项目

#### 部署步骤:
1. 访问 [Railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 选择 `backend` 目录作为根目录
4. 设置环境变量
5. 自动部署

#### 环境变量配置:
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 2. **Render**
- **优点**: 免费额度，自动部署，支持 Docker
- **价格**: 免费层 + 付费层
- **适合**: 个人项目和小团队

#### 部署步骤:
1. 访问 [Render.com](https://render.com)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 设置构建命令: `cd backend && npm install`
5. 设置启动命令: `cd backend && npm start`
6. 配置环境变量

### 3. **Heroku**
- **优点**: 老牌平台，生态成熟
- **价格**: 免费层已取消，最低 $7/月
- **适合**: 企业级应用

#### 部署步骤:
1. 安装 Heroku CLI
2. 创建 Heroku 应用
3. 设置环境变量
4. 部署代码

```bash
# 安装 Heroku CLI
npm install -g heroku

# 登录
heroku login

# 创建应用
heroku create your-app-name

# 设置环境变量
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=your-url
# ... 其他环境变量

# 部署
git push heroku main
```

### 4. **DigitalOcean App Platform**
- **优点**: 性能好，价格合理
- **价格**: $5/月起
- **适合**: 生产环境

#### 部署步骤:
1. 访问 [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. 创建新应用
3. 选择 GitHub 仓库
4. 配置构建和运行设置
5. 设置环境变量

### 5. **AWS EC2** (高级)
- **优点**: 完全控制，可扩展性强
- **价格**: 按使用量付费
- **适合**: 大型项目

#### 部署步骤:
1. 创建 EC2 实例
2. 安装 Node.js 和 PM2
3. 配置 Nginx 反向代理
4. 设置 SSL 证书
5. 配置监控和日志

### 6. **Docker 部署** (通用)
- **优点**: 跨平台，易于管理
- **价格**: 取决于托管平台
- **适合**: 任何环境

#### 使用 Docker Compose:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN}
    restart: unless-stopped
```

## 🔧 环境变量配置

### 必需的环境变量:
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

## 📊 监控和日志

### 1. 健康检查
```bash
curl https://your-backend-domain.com/health
```

### 2. 日志监控
- 使用 PM2 进行进程管理
- 配置日志轮转
- 设置告警

### 3. 性能监控
- 使用 New Relic 或 DataDog
- 监控响应时间和错误率
- 设置自动扩缩容

## 🔒 安全配置

### 1. HTTPS
- 使用 Let's Encrypt 免费证书
- 配置 HSTS 头部
- 强制 HTTPS 重定向

### 2. 防火墙
- 只开放必要端口
- 配置 IP 白名单
- 使用 CDN 防护

### 3. 环境变量
- 使用密钥管理服务
- 定期轮换密钥
- 限制访问权限

## 🚀 推荐部署流程

### 1. 开发环境
```bash
# 本地开发
npm run dev:full
```

### 2. 测试环境
```bash
# 部署到测试环境
npm run deploy:staging
```

### 3. 生产环境
```bash
# 部署到生产环境
npm run deploy:production
```

## 📞 技术支持

如果遇到部署问题，请检查：
1. 环境变量是否正确配置
2. 端口是否开放
3. 网络连接是否正常
4. 日志文件中的错误信息

## 🎯 最佳实践

1. **使用环境变量管理配置**
2. **设置健康检查端点**
3. **配置日志轮转**
4. **使用进程管理器 (PM2)**
5. **设置监控和告警**
6. **定期备份数据**
7. **使用 HTTPS**
8. **配置 CORS 正确**
9. **设置速率限制**
10. **定期更新依赖**
