# 开发环境清理脚本
Write-Host "🧹 开始清理开发环境..." -ForegroundColor Green

# 终止占用3000端口的进程
Write-Host "🔍 检查端口3000占用情况..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "⚠️  发现端口3000被占用，正在终止进程..." -ForegroundColor Red
    $processes | ForEach-Object {
        $pid = $_.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "✅ 已终止进程 $pid" -ForegroundColor Green
    }
}

# 清理Next.js缓存
Write-Host "🗑️  清理Next.js缓存..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Write-Host "✅ Next.js缓存已清理" -ForegroundColor Green

# 清理npm缓存
Write-Host "🗑️  清理npm缓存..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "✅ npm缓存已清理" -ForegroundColor Green

# 清理node_modules缓存
Write-Host "🗑️  清理node_modules缓存..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Write-Host "✅ node_modules缓存已清理" -ForegroundColor Green

Write-Host "🎉 清理完成！现在可以运行 npm run dev" -ForegroundColor Green
