# Railway 完整配置脚本
Write-Host "🚀 开始配置 Railway 后端..." -ForegroundColor Green

# 检查是否已登录
Write-Host "检查 Railway 登录状态..." -ForegroundColor Yellow
$loginCheck = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 请先运行 'railway login' 登录 Railway" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Railway 已登录" -ForegroundColor Green

# 检查项目连接
Write-Host "检查项目连接..." -ForegroundColor Yellow
$projectCheck = railway status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 请先运行 'railway link' 连接项目" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 项目已连接" -ForegroundColor Green

# 设置环境变量
Write-Host "设置环境变量..." -ForegroundColor Yellow

# 基础配置
Write-Host "设置基础配置..." -ForegroundColor Cyan
railway variables set NODE_ENV=production
railway variables set PORT=8080

# 数据库配置 - 需要替换为真实值
Write-Host "设置数据库配置..." -ForegroundColor Cyan
Write-Host "⚠️  请替换以下占位符为真实值:" -ForegroundColor Yellow
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
Write-Host "设置认证配置..." -ForegroundColor Cyan
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set JWT_EXPIRES_IN=24h
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set BCRYPT_SALT_ROUNDS=12

# 支付配置 - 需要替换为真实值
Write-Host "设置支付配置..." -ForegroundColor Cyan
Write-Host "⚠️  请替换以下占位符为真实值:" -ForegroundColor Yellow
railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS 配置 - 需要替换为真实值
Write-Host "设置 CORS 配置..." -ForegroundColor Cyan
Write-Host "⚠️  请替换以下占位符为真实值:" -ForegroundColor Yellow
railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app
railway variables set CORS_CREDENTIALS=true

# 安全配置
Write-Host "设置安全配置..." -ForegroundColor Cyan
railway variables set HELMET_ENABLED=true
railway variables set CSP_ENABLED=true
railway variables set HSTS_ENABLED=true

# 速率限制
Write-Host "设置速率限制..." -ForegroundColor Cyan
railway variables set RATE_LIMIT_MAX_REQUESTS=1000
railway variables set RATE_LIMIT_WINDOW_MS=900000

# 日志配置
Write-Host "设置日志配置..." -ForegroundColor Cyan
railway variables set LOG_LEVEL=info

# 监控配置
Write-Host "设置监控配置..." -ForegroundColor Cyan
railway variables set MONITORING_ENABLED=true
railway variables set HEALTH_CHECK_INTERVAL=30000

Write-Host "✅ 环境变量设置完成！" -ForegroundColor Green

# 重新部署
Write-Host "重新部署后端..." -ForegroundColor Yellow
railway up

Write-Host "✅ 部署完成！" -ForegroundColor Green

# 显示状态
Write-Host "查看部署状态..." -ForegroundColor Yellow
railway status

Write-Host "查看日志..." -ForegroundColor Yellow
railway logs --tail 20

Write-Host "🎉 Railway 后端配置完成！" -ForegroundColor Green
Write-Host "测试端点: https://ticketing-ai-production.up.railway.app/health" -ForegroundColor Cyan
