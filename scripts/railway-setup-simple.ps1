# Railway Simple Setup Script
Write-Host "Starting Railway setup..." -ForegroundColor Green

# Check login status
Write-Host "Checking Railway login status..." -ForegroundColor Yellow
railway whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please run: railway login" -ForegroundColor Red
    exit 1
}

# Check project connection
Write-Host "Checking project connection..." -ForegroundColor Yellow
railway status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please run: railway link" -ForegroundColor Red
    exit 1
}

Write-Host "Setting environment variables..." -ForegroundColor Green

# Set basic environment variables
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

Write-Host "Basic environment variables set!" -ForegroundColor Green
Write-Host "Please manually set these variables:" -ForegroundColor Yellow
Write-Host "railway variables set SUPABASE_URL=https://your-project.supabase.co" -ForegroundColor White
Write-Host "railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" -ForegroundColor White
Write-Host "railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key" -ForegroundColor White
Write-Host "railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app" -ForegroundColor White
Write-Host "Then run: railway up" -ForegroundColor Cyan
