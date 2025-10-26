# PowerShell 启动脚本
Write-Host "🚀 启动开发环境..." -ForegroundColor Green

# 检查 Node.js 版本
$nodeVersion = node -v
Write-Host "📦 Node.js 版本: $nodeVersion" -ForegroundColor Cyan

# 安装前端依赖
Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
npm install

# 安装后端依赖
Write-Host "📦 安装后端依赖..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# 检查环境变量
Write-Host "🔧 检查环境变量..." -ForegroundColor Yellow
if (-not (Test-Path .env.local)) {
    Write-Host "⚠️  未找到 .env.local 文件，请复制 env.example 并配置" -ForegroundColor Red
    Copy-Item env.example .env.local
    Write-Host "✅ 已创建 .env.local 文件，请编辑配置" -ForegroundColor Green
}

# 启动后端服务
Write-Host "🔧 启动后端服务..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd backend && npm run dev" -WindowStyle Minimized

# 等待后端启动
Start-Sleep -Seconds 5

# 启动前端服务
Write-Host "🔧 启动前端服务..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WindowStyle Normal

Write-Host "✅ 开发环境已启动" -ForegroundColor Green
Write-Host "🌐 前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 后端: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 健康检查: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "按任意键停止服务..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
