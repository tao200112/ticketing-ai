# Stripe CLI 安装脚本
Write-Host "🔧 设置 Stripe CLI..." -ForegroundColor Green

# 获取当前目录的绝对路径
$currentDir = Get-Location
$stripeCliPath = Join-Path $currentDir "stripe-cli"

# 检查 stripe.exe 是否存在
if (Test-Path (Join-Path $stripeCliPath "stripe.exe")) {
    Write-Host "✅ Stripe CLI 文件已找到" -ForegroundColor Green
    
    # 测试 Stripe CLI
    Write-Host "🧪 测试 Stripe CLI..." -ForegroundColor Yellow
    & "$stripeCliPath\stripe.exe" --version
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stripe CLI 工作正常！" -ForegroundColor Green
        
        # 创建别名脚本
        $aliasScript = @"
# Stripe CLI 别名脚本
# 将此文件添加到您的 PowerShell 配置文件中，或直接运行此脚本

# 设置 Stripe CLI 路径
`$env:PATH += ";$stripeCliPath"

# 创建别名
Set-Alias -Name stripe -Value "$stripeCliPath\stripe.exe"

Write-Host "🎉 Stripe CLI 已配置完成！" -ForegroundColor Green
Write-Host "📍 路径: $stripeCliPath" -ForegroundColor Cyan
Write-Host "💡 使用方法: stripe --help" -ForegroundColor Yellow
"@
        
        $aliasScript | Out-File -FilePath "stripe-cli-setup.ps1" -Encoding UTF8
        Write-Host "📝 已创建配置脚本: stripe-cli-setup.ps1" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Stripe CLI 测试失败" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 未找到 stripe.exe 文件" -ForegroundColor Red
}

Write-Host "🎯 下一步：运行 .\stripe-cli-setup.ps1 来配置环境" -ForegroundColor Yellow