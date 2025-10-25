# 🔧 Windows 权限设置脚本
# 使用方法: powershell -ExecutionPolicy Bypass -File scripts/setup_permissions.ps1

Write-Host "🔧 设置脚本权限..." -ForegroundColor Blue

# 设置脚本执行权限
$scripts = @(
    "scripts/backup_db.sh",
    "scripts/restore_db.sh", 
    "scripts/quick_rollback.sh",
    "scripts/setup_version_management.sh"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "✅ 找到脚本: $script" -ForegroundColor Green
    } else {
        Write-Host "⚠️  脚本不存在: $script" -ForegroundColor Yellow
    }
}

Write-Host "✅ 权限设置完成" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Blue
Write-Host "1. 配置环境变量: cp env.example .env.local"
Write-Host "2. 编辑 .env.local 文件，填入实际值"
Write-Host "3. 测试数据库备份: npm run backup:db"
Write-Host "4. 提交代码: git add . && git commit -m 'feat: 初始化版本管理系统'"
