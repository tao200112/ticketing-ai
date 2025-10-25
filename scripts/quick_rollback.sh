#!/bin/bash

# 🚀 快速回滚脚本 - 一键回滚到上一个稳定版本
# 使用方法: ./scripts/quick_rollback.sh

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

log_info "🚀 开始快速回滚流程..."

# 1. 检查当前状态
log_info "检查当前 Git 状态..."
if [ -n "$(git status --porcelain)" ]; then
    log_warning "检测到未提交的更改，正在暂存..."
    git stash push -m "Auto-stash before rollback $(date)"
fi

# 2. 获取上一个稳定版本
log_info "查找上一个稳定版本..."
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
if [ -z "$PREVIOUS_TAG" ]; then
    log_warning "未找到上一个标签，使用上一个提交"
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
    ROLLBACK_TARGET="$PREVIOUS_COMMIT"
else
    ROLLBACK_TARGET="$PREVIOUS_TAG"
    log_info "找到上一个版本: $PREVIOUS_TAG"
fi

# 3. 显示回滚信息
log_warning "即将回滚到: $ROLLBACK_TARGET"
git log --oneline -5 "$ROLLBACK_TARGET"

echo ""
read -p "确认回滚? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "回滚已取消"
    exit 0
fi

# 4. 执行 Git 回滚
log_info "执行 Git 回滚..."
git revert -m 1 HEAD --no-edit

# 5. 推送到远程
log_info "推送到远程仓库..."
git push origin main

# 6. 数据库回滚（如果有备份）
log_info "检查数据库备份..."
LATEST_BACKUP=$(ls -t backups/backup_*.sql* 2>/dev/null | head -n 1)
if [ -n "$LATEST_BACKUP" ]; then
    log_warning "发现数据库备份: $LATEST_BACKUP"
    read -p "是否恢复数据库? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "恢复数据库..."
        ./scripts/restore_db.sh "$LATEST_BACKUP"
    fi
else
    log_info "未找到数据库备份，跳过数据库回滚"
fi

# 7. Vercel 回滚提示
log_info "Vercel 回滚选项:"
echo "1. 在 Vercel Dashboard 中点击 'Promote to Production'"
echo "2. 使用 CLI: vercel promote <deployment_id>"
echo "3. 查看部署历史: vercel ls"

log_success "回滚完成!"
log_info "当前版本: $(git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD)"
log_info "如需恢复暂存的更改: git stash pop"
