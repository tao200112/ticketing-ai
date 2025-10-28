# Railway 环境变量设置脚本 (PowerShell)

Write-Host "🚀 设置 Railway 环境变量..." -ForegroundColor Green

# 基础配置
Write-Host "设置基础配置..." -ForegroundColor Yellow
railway variables set NODE_ENV=production
railway variables set PORT=8080

# 数据库配置
Write-Host "设置数据库配置..." -ForegroundColor Yellow
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
Write-Host "设置认证配置..." -ForegroundColor Yellow
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set JWT_EXPIRES_IN=24h
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set BCRYPT_SALT_ROUNDS=12

# 支付配置
Write-Host "设置支付配置..." -ForegroundColor Yellow
railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS 配置
Write-Host "设置 CORS 配置..." -ForegroundColor Yellow
railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app
railway variables set CORS_CREDENTIALS=true

# 安全配置
Write-Host "设置安全配置..." -ForegroundColor Yellow
railway variables set HELMET_ENABLED=true
railway variables set CSP_ENABLED=true
railway variables set HSTS_ENABLED=true

# 速率限制
Write-Host "设置速率限制..." -ForegroundColor Yellow
railway variables set RATE_LIMIT_MAX_REQUESTS=1000
railway variables set RATE_LIMIT_WINDOW_MS=900000

# 日志配置
Write-Host "设置日志配置..." -ForegroundColor Yellow
railway variables set LOG_LEVEL=info

# 监控配置
Write-Host "设置监控配置..." -ForegroundColor Yellow
railway variables set MONITORING_ENABLED=true
railway variables set HEALTH_CHECK_INTERVAL=30000

Write-Host "✅ 环境变量设置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 下一步：" -ForegroundColor Cyan
Write-Host "1. 替换占位符为真实值" -ForegroundColor White
Write-Host "2. 运行: railway up" -ForegroundColor White
Write-Host "3. 查看日志: railway logs" -ForegroundColor White
