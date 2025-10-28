.\scripts\railway-quick-setup.ps1# Railway 手动配置步骤

## 🚀 使用 Railway CLI 配置后端

### 步骤 1：安装 Railway CLI
```bash
npm install -g @railway/cli
```

### 步骤 2：登录 Railway
```bash
railway login
```
- 这会打开浏览器，让您登录 Railway 账户
- 登录成功后，CLI 会自动配置认证

### 步骤 3：连接到项目
```bash
railway link
```
- 选择您的 `ticketing-ai` 项目
- 如果项目不存在，选择 "Create new project"

### 步骤 4：设置环境变量
使用以下命令设置必需的环境变量：

```bash
# 基础配置
railway variables set NODE_ENV=production
railway variables set PORT=8080

# 数据库配置
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set JWT_EXPIRES_IN=24h
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set BCRYPT_SALT_ROUNDS=12

# 支付配置
railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS 配置
railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app
railway variables set CORS_CREDENTIALS=true

# 安全配置
railway variables set HELMET_ENABLED=true
railway variables set CSP_ENABLED=true
railway variables set HSTS_ENABLED=true

# 速率限制
railway variables set RATE_LIMIT_MAX_REQUESTS=1000
railway variables set RATE_LIMIT_WINDOW_MS=900000

# 日志配置
railway variables set LOG_LEVEL=info

# 监控配置
railway variables set MONITORING_ENABLED=true
railway variables set HEALTH_CHECK_INTERVAL=30000
```

### 步骤 5：重新部署
```bash
railway up
```

### 步骤 6：查看日志
```bash
railway logs
```

### 步骤 7：查看服务状态
```bash
railway status
```

## 🔍 验证部署

部署完成后，测试以下端点：

- `https://ticketing-ai-production.up.railway.app/health` - 应该返回 JSON
- `https://ticketing-ai-production.up.railway.app/v1/health` - 应该返回 JSON
- `https://ticketing-ai-production.up.railway.app/v1/events` - 应该返回活动列表

## 🚨 重要提醒

1. **替换占位符**：将命令中的 `your-project.supabase.co`、`your-service-role-key` 等替换为真实值
2. **前端域名**：将 `your-frontend-domain.vercel.app` 替换为您的实际 Vercel 域名
3. **JWT 密钥**：确保 JWT_SECRET 至少 32 个字符
4. **Stripe 密钥**：使用生产环境的 Stripe 密钥

## 🔧 故障排除

### 如果 railway up 失败：
1. 检查所有环境变量是否正确设置
2. 查看 `railway logs` 中的错误信息
3. 确认 `backend/package.json` 和 `backend/server.js` 存在

### 如果仍然部署前端：
1. 确认 `railway.json` 在项目根目录
2. 检查 Railway 是否正确识别了 `rootDirectory: "backend"`
3. 尝试删除项目重新创建

### 如果端口问题：
1. 确认 PORT 环境变量设置为 8080
2. 检查 `backend/server.js` 中的端口配置
3. 确认 Railway 分配的端口正确

## 📞 需要帮助？

如果遇到问题：
1. 运行 `railway logs` 查看详细错误
2. 检查 Railway Dashboard 中的项目设置
3. 确认所有环境变量都已正确设置
