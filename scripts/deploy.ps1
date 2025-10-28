# PartyTix 快速部署脚本 (Windows PowerShell)
# 使用方法: .\scripts\deploy.ps1 [frontend|backend|all]

param(
    [string]$Action = "all"
)

# 颜色定义
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# 日志函数
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# 检查必要的工具
function Test-Requirements {
    Write-LogInfo "检查部署要求..."
    
    # 检查 Node.js
    try {
        $nodeVersion = node --version
        Write-LogInfo "Node.js 版本: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js 未安装"
        exit 1
    }
    
    # 检查 npm
    try {
        $npmVersion = npm --version
        Write-LogInfo "npm 版本: $npmVersion"
    }
    catch {
        Write-LogError "npm 未安装"
        exit 1
    }
    
    # 检查 Git
    try {
        $gitVersion = git --version
        Write-LogInfo "Git 版本: $gitVersion"
    }
    catch {
        Write-LogError "Git 未安装"
        exit 1
    }
    
    Write-LogSuccess "所有要求已满足"
}

# 检查环境变量
function Test-EnvironmentVariables {
    Write-LogInfo "检查环境变量..."
    
    # 检查前端环境变量
    if (Test-Path ".env.local") {
        Write-LogInfo "找到 .env.local 文件"
    }
    else {
        Write-LogWarning "未找到 .env.local 文件，请确保在 Vercel 中设置了环境变量"
    }
    
    # 检查后端环境变量
    if (Test-Path "backend\.env") {
        Write-LogInfo "找到 backend\.env 文件"
    }
    else {
        Write-LogWarning "未找到 backend\.env 文件，请确保在 Railway 中设置了环境变量"
    }
    
    Write-LogSuccess "环境变量检查完成"
}

# 构建前端
function Build-Frontend {
    Write-LogInfo "构建前端..."
    
    # 安装依赖
    Write-LogInfo "安装前端依赖..."
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "前端依赖安装失败"
        exit 1
    }
    
    # 构建
    Write-LogInfo "构建 Next.js 应用..."
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "前端构建失败"
        exit 1
    }
    
    Write-LogSuccess "前端构建完成"
}

# 构建后端
function Build-Backend {
    Write-LogInfo "构建后端..."
    
    # 进入后端目录
    Push-Location backend
    
    try {
        # 安装依赖
        Write-LogInfo "安装后端依赖..."
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "后端依赖安装失败"
            exit 1
        }
    }
    finally {
        # 返回根目录
        Pop-Location
    }
    
    Write-LogSuccess "后端构建完成"
}

# 部署前端到 Vercel
function Deploy-Frontend {
    Write-LogInfo "部署前端到 Vercel..."
    
    # 检查是否安装了 Vercel CLI
    try {
        $vercelVersion = vercel --version
        Write-LogInfo "Vercel CLI 版本: $vercelVersion"
    }
    catch {
        Write-LogInfo "安装 Vercel CLI..."
        npm install -g vercel
    }
    
    # 部署
    Write-LogInfo "开始部署到 Vercel..."
    vercel --prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "前端部署失败"
        exit 1
    }
    
    Write-LogSuccess "前端部署完成"
}

# 部署后端到 Railway
function Deploy-Backend {
    Write-LogInfo "部署后端到 Railway..."
    
    # 检查是否安装了 Railway CLI
    try {
        $railwayVersion = railway --version
        Write-LogInfo "Railway CLI 版本: $railwayVersion"
    }
    catch {
        Write-LogInfo "安装 Railway CLI..."
        npm install -g @railway/cli
    }
    
    # 登录 Railway
    Write-LogInfo "登录 Railway..."
    railway login
    
    # 部署
    Write-LogInfo "开始部署到 Railway..."
    railway up --service backend
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "后端部署失败"
        exit 1
    }
    
    Write-LogSuccess "后端部署完成"
}

# 验证部署
function Test-Deployment {
    Write-LogInfo "验证部署..."
    
    Write-LogInfo "请手动验证以下内容："
    Write-Host "1. 前端是否正常加载"
    Write-Host "2. 后端 API 是否响应"
    Write-Host "3. 数据库连接是否正常"
    Write-Host "4. 支付功能是否正常"
    
    Write-LogSuccess "验证完成"
}

# 主函数
function Main {
    Write-LogInfo "开始 PartyTix 部署流程..."
    Write-LogInfo "部署目标: $Action"
    
    # 检查要求
    Test-Requirements
    
    # 检查环境变量
    Test-EnvironmentVariables
    
    switch ($Action.ToLower()) {
        "frontend" {
            Build-Frontend
            Deploy-Frontend
        }
        "backend" {
            Build-Backend
            Deploy-Backend
        }
        "all" {
            Build-Frontend
            Build-Backend
            Deploy-Backend
            Deploy-Frontend
        }
        default {
            Write-LogError "无效的部署目标: $Action"
            Write-Host "使用方法: .\scripts\deploy.ps1 [frontend|backend|all]"
            exit 1
        }
    }
    
    # 验证部署
    Test-Deployment
    
    Write-LogSuccess "部署流程完成！"
}

# 运行主函数
Main
