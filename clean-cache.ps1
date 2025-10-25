# Clean Next.js cache script
Write-Host "Cleaning Next.js cache..." -ForegroundColor Green

# Stop running processes
Write-Host "Stopping dev server..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean cache directories
Write-Host "Cleaning cache directories..." -ForegroundColor Yellow
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .turbo -Recurse -Force -ErrorAction SilentlyContinue

# Clean temp files
Write-Host "Cleaning temp files..." -ForegroundColor Yellow
Remove-Item *.log -Force -ErrorAction SilentlyContinue
Remove-Item .DS_Store -Force -ErrorAction SilentlyContinue

Write-Host "Cache cleanup completed!" -ForegroundColor Green
Write-Host "Now you can run 'npm run dev' to restart the dev server" -ForegroundColor Cyan
