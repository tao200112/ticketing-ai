#!/bin/bash

# PartyTix 快速部署脚本
# 使用方法: ./scripts/deploy.sh [frontend|backend|all]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    log_info "检查部署要求..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装"
        exit 1
    fi
    
    log_success "所有要求已满足"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量..."
    
    # 检查前端环境变量
    if [ -f ".env.local" ]; then
        log_info "找到 .env.local 文件"
    else
        log_warning "未找到 .env.local 文件，请确保在 Vercel 中设置了环境变量"
    fi
    
    # 检查后端环境变量
    if [ -f "backend/.env" ]; then
        log_info "找到 backend/.env 文件"
    else
        log_warning "未找到 backend/.env 文件，请确保在 Railway 中设置了环境变量"
    fi
    
    log_success "环境变量检查完成"
}

# 构建前端
build_frontend() {
    log_info "构建前端..."
    
    # 安装依赖
    log_info "安装前端依赖..."
    npm install
    
    # 构建
    log_info "构建 Next.js 应用..."
    npm run build
    
    log_success "前端构建完成"
}

# 构建后端
build_backend() {
    log_info "构建后端..."
    
    # 进入后端目录
    cd backend
    
    # 安装依赖
    log_info "安装后端依赖..."
    npm install
    
    # 返回根目录
    cd ..
    
    log_success "后端构建完成"
}

# 部署前端到 Vercel
deploy_frontend() {
    log_info "部署前端到 Vercel..."
    
    # 检查是否安装了 Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_info "安装 Vercel CLI..."
        npm install -g vercel
    fi
    
    # 部署
    log_info "开始部署到 Vercel..."
    vercel --prod
    
    log_success "前端部署完成"
}

# 部署后端到 Railway
deploy_backend() {
    log_info "部署后端到 Railway..."
    
    # 检查是否安装了 Railway CLI
    if ! command -v railway &> /dev/null; then
        log_info "安装 Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # 登录 Railway
    log_info "登录 Railway..."
    railway login
    
    # 部署
    log_info "开始部署到 Railway..."
    railway up --service backend
    
    log_success "后端部署完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 这里可以添加健康检查
    log_info "请手动验证以下内容："
    echo "1. 前端是否正常加载"
    echo "2. 后端 API 是否响应"
    echo "3. 数据库连接是否正常"
    echo "4. 支付功能是否正常"
    
    log_success "验证完成"
}

# 主函数
main() {
    local action=${1:-"all"}
    
    log_info "开始 PartyTix 部署流程..."
    log_info "部署目标: $action"
    
    # 检查要求
    check_requirements
    
    # 检查环境变量
    check_env_vars
    
    case $action in
        "frontend")
            build_frontend
            deploy_frontend
            ;;
        "backend")
            build_backend
            deploy_backend
            ;;
        "all")
            build_frontend
            build_backend
            deploy_backend
            deploy_frontend
            ;;
        *)
            log_error "无效的部署目标: $action"
            echo "使用方法: $0 [frontend|backend|all]"
            exit 1
            ;;
    esac
    
    # 验证部署
    verify_deployment
    
    log_success "部署流程完成！"
}

# 运行主函数
main "$@"
