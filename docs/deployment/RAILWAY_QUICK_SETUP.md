# 🚀 Railway 快速配置指南

## 当前状态
- ✅ Railway CLI 已安装
- ✅ 项目文件已准备就绪
- ⏳ 需要手动登录和配置

## 立即执行的步骤

### 1. 登录 Railway
```bash
railway login
```
- 这会打开浏览器让您登录
- 登录成功后返回终端

### 2. 连接到项目
```bash
railway link
```
- 选择 `ticketing-ai` 项目
- 如果不存在，选择 "Create new project"

### 3. 设置环境变量
**选项 A：使用脚本（推荐）**
```bash
# Windows PowerShell
.\scripts\set-railway-variables.ps1

# Linux/Mac
chmod +x scripts/set-railway-variables.sh
./scripts/set-railway-variables.sh
```

**选项 B：手动设置**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key
railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 4. 重新部署
```bash
railway up
```

### 5. 查看状态
```bash
railway logs
railway status
```

## 🔍 验证部署

部署完成后，测试：
- `https://ticketing-ai-production.up.railway.app/health`
- `https://ticketing-ai-production.up.railway.app/v1/events`

## ⚠️ 重要提醒

1. **替换占位符**：将 `your-project.supabase.co` 等替换为真实值
2. **前端域名**：将 `your-frontend-domain.vercel.app` 替换为实际 Vercel 域名
3. **JWT 密钥**：确保至少 32 个字符
4. **Stripe 密钥**：使用生产环境密钥

## 🆘 如果遇到问题

1. 查看 `railway logs` 中的错误
2. 检查环境变量是否正确设置
3. 确认 `railway.json` 在项目根目录
4. 尝试删除项目重新创建

## 📞 需要帮助？

运行以下命令查看详细状态：
```bash
railway status
railway logs
railway variables
```
