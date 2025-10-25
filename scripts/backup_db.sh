#!/bin/bash

# 🗄️ Supabase 数据库备份脚本
# 使用方法: ./scripts/backup_db.sh
# 环境变量: SUPABASE_DB_URL

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查环境变量
if [ -z "$SUPABASE_DB_URL" ]; then
    log_error "未设置 SUPABASE_DB_URL 环境变量"
    log_info "请在 .env 文件中设置: SUPABASE_DB_URL=postgresql://..."
    exit 1
fi

# 创建备份目录
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
BACKUP_META="$BACKUP_DIR/backup_$TIMESTAMP.meta"

log_info "开始备份数据库..."

# 获取 Git 信息
GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "no-tag")

# 创建元数据文件
cat > "$BACKUP_META" << EOF
# 数据库备份元数据
备份时间: $(date)
Git SHA: $GIT_SHA
Git 分支: $GIT_BRANCH
Git 标签: $GIT_TAG
备份文件: $BACKUP_FILE
数据库URL: ${SUPABASE_DB_URL%%@*}@[隐藏]
EOF

# 执行数据库备份
log_info "正在导出数据库结构..."
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges > "$BACKUP_FILE"

log_info "正在导出数据库数据..."
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-privileges >> "$BACKUP_FILE"

# 添加备份信息到 SQL 文件头部
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << EOF
-- ============================================
-- 🗄️  Supabase 数据库备份
-- ============================================
-- 备份时间: $(date)
-- Git SHA: $GIT_SHA
-- Git 分支: $GIT_BRANCH
-- Git 标签: $GIT_TAG
-- 备份文件: $BACKUP_FILE
-- ============================================

EOF

# 将备份内容追加到临时文件
cat "$BACKUP_FILE" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$BACKUP_FILE"

# 压缩备份文件（可选）
if command -v gzip &> /dev/null; then
    log_info "正在压缩备份文件..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    log_success "备份文件已压缩: $BACKUP_FILE"
fi

# 获取文件大小
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

log_success "数据库备份完成!"
log_info "备份文件: $BACKUP_FILE"
log_info "文件大小: $FILE_SIZE"
log_info "元数据文件: $BACKUP_META"

# 清理旧备份（保留最近 10 个）
log_info "清理旧备份文件..."
cd "$BACKUP_DIR"
ls -t backup_*.sql* backup_*.meta 2>/dev/null | tail -n +21 | xargs -r rm -f
cd ..

log_success "备份流程完成!"

# 显示使用说明
echo ""
log_info "🔄 恢复数据库命令:"
echo "   ./scripts/restore_db.sh $BACKUP_FILE"
echo ""
log_info "📋 查看备份列表:"
echo "   ls -la $BACKUP_DIR/"
