# Stripe CLI 配置脚本
Write-Host "🎉 配置 Stripe CLI..." -ForegroundColor Green

# 设置 Stripe CLI 路径
$stripeCliPath = Join-Path (Get-Location) "stripe-cli"
$env:PATH += ";$stripeCliPath"

# 创建别名
Set-Alias -Name stripe -Value "$stripeCliPath\stripe.exe"

Write-Host "✅ Stripe CLI 已配置完成！" -ForegroundColor Green
Write-Host "📍 路径: $stripeCliPath" -ForegroundColor Cyan
Write-Host "💡 使用方法: stripe --help" -ForegroundColor Yellow

# 显示帮助信息
Write-Host "`n🔧 常用命令:" -ForegroundColor Yellow
Write-Host "  stripe login          - 登录到您的 Stripe 账户" -ForegroundColor White
Write-Host "  stripe listen         - 监听 webhook 事件" -ForegroundColor White
Write-Host "  stripe --help          - 查看所有可用命令" -ForegroundColor White