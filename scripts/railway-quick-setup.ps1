# Railway 快速配置脚本
Write-Host "🚀 Railway 快速配置..." -ForegroundColor Green

# 检查登录状态
Write-Host "检查 Railway 登录状态..." -ForegroundColor Yellow
railway whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 请先运行: railway login" -ForegroundColor Red
    exit 1
}

# 检查项目连接
Write-Host "检查项目连接..." -ForegroundColor Yellow
railway status
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 请先运行: railway link" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 开始设置环境变量..." -ForegroundColor Green

# 设置基础环境变量
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set JWT_EXPIRES_IN=24h
railway variables set BCRYPT_SALT_ROUNDS=12
railway variables set CORS_CREDENTIALS=true
railway variables set HELMET_ENABLED=true
railway variables set RATE_LIMIT_MAX_REQUESTS=1000
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set LOG_LEVEL=info
railway variables set MONITORING_ENABLED=true

Write-Host "⚠️  需要手动设置以下变量:" -ForegroundColor Yellow
Write-Host "railway variables set SUPABASE_URL=https://your-project.supabase.co" -ForegroundColor White
Write-Host "railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" -ForegroundColor White
Write-Host "railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key" -ForegroundColor White
Write-Host "railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app" -ForegroundColor White

Write-Host "✅ 基础环境变量设置完成！" -ForegroundColor Green
Write-Host "Please manually set the above variables, then run: railway up" -ForegroundColor Cyan
