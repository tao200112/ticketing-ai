#!/bin/bash

# 🚀 版本管理系统快速设置脚本
# 使用方法: ./scripts/setup_version_management.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info "🚀 开始设置版本管理系统..."

# 1. 检查必要工具
log_info "检查必要工具..."

# 检查 Git
if ! command -v git &> /dev/null; then
    log_error "Git 未安装，请先安装 Git"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 psql（PostgreSQL 客户端）
if ! command -v psql &> /dev/null; then
    log_warning "PostgreSQL 客户端未安装，数据库备份功能将不可用"
fi

log_success "必要工具检查完成"

# 2. 设置 Git 钩子
log_info "设置 Git 钩子..."

# 创建 pre-commit 钩子
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# 代码提交前检查

echo "🔍 运行代码检查..."

# 运行 lint 检查
npm run lint

# 检查是否有未跟踪的文件
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改"
    git status --short
fi

echo "✅ 代码检查通过"
EOF

chmod +x .git/hooks/pre-commit

# 创建 commit-msg 钩子
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# 提交信息格式检查

commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ 提交信息格式不正确"
    echo "正确格式: type(scope): description"
    echo "类型: feat, fix, docs, style, refactor, test, chore"
    echo "示例: feat: 添加用户登录功能"
    exit 1
fi
EOF

chmod +x .git/hooks/commit-msg

log_success "Git 钩子设置完成"

# 3. 设置环境变量
log_info "设置环境变量..."

if [ ! -f ".env.local" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env.local
        log_success "已创建 .env.local 文件"
        log_warning "请编辑 .env.local 文件并填入实际的环境变量值"
    else
        log_warning "未找到 env.example 文件"
    fi
else
    log_info ".env.local 文件已存在"
fi

# 4. 创建必要的目录
log_info "创建必要的目录..."

mkdir -p backups
mkdir -p scripts
mkdir -p .github/workflows

log_success "目录创建完成"

# 5. 设置脚本权限
log_info "设置脚本权限..."

chmod +x scripts/*.sh 2>/dev/null || true

log_success "脚本权限设置完成"

# 6. 初始化 Git 标签
log_info "初始化 Git 标签..."

# 检查是否已有标签
if ! git describe --tags --abbrev=0 &> /dev/null; then
    # 创建初始标签
    git tag -a v0.1.0 -m "初始版本"
    log_success "已创建初始标签 v0.1.0"
else
    log_info "Git 标签已存在"
fi

# 7. 测试数据库连接（如果配置了）
log_info "测试数据库连接..."

if [ -n "$SUPABASE_DB_URL" ]; then
    if command -v psql &> /dev/null; then
        if psql "$SUPABASE_DB_URL" -c "SELECT 1;" &> /dev/null; then
            log_success "数据库连接正常"
        else
            log_warning "数据库连接失败，请检查 SUPABASE_DB_URL"
        fi
    else
        log_warning "PostgreSQL 客户端未安装，跳过数据库测试"
    fi
else
    log_warning "未配置 SUPABASE_DB_URL，跳过数据库测试"
fi

# 8. 显示设置完成信息
log_success "版本管理系统设置完成!"

echo ""
log_info "📋 下一步操作:"
echo "1. 编辑 .env.local 文件，配置环境变量"
echo "2. 测试数据库备份: ./scripts/backup_db.sh"
echo "3. 提交代码: git add . && git commit -m 'feat: 初始化版本管理系统'"
echo "4. 推送到远程: git push origin main"
echo ""

log_info "🛠️  可用命令:"
echo "  ./scripts/backup_db.sh      # 备份数据库"
echo "  ./scripts/restore_db.sh     # 恢复数据库"
echo "  ./scripts/quick_rollback.sh # 快速回滚"
echo ""

log_info "📚 文档:"
echo "  README.md                   # 项目说明"
echo "  CHANGELOG.md                # 更新日志"
echo "  supabase/migrations/README.md # 数据库迁移指南"
echo ""

log_success "🎉 版本管理系统已就绪!"
