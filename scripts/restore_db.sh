#!/bin/bash

# 🔄 Supabase 数据库恢复脚本
# 使用方法: ./scripts/restore_db.sh <backup_file>
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

# 检查参数
if [ $# -eq 0 ]; then
    log_error "请指定备份文件"
    log_info "使用方法: ./scripts/restore_db.sh <backup_file>"
    log_info "可用备份文件:"
    ls -la backups/backup_*.sql* 2>/dev/null || echo "  无可用备份文件"
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 检查环境变量
if [ -z "$SUPABASE_DB_URL" ]; then
    log_error "未设置 SUPABASE_DB_URL 环境变量"
    log_info "请在 .env 文件中设置: SUPABASE_DB_URL=postgresql://..."
    exit 1
fi

log_warning "⚠️  此操作将完全替换当前数据库内容!"
log_warning "⚠️  请确保您有当前数据库的备份!"

# 确认操作
read -p "是否继续? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "操作已取消"
    exit 0
fi

log_info "开始恢复数据库..."

# 检查备份文件类型
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "检测到压缩文件，正在解压..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    BACKUP_FILE="$TEMP_FILE"
    CLEANUP_TEMP=true
else
    CLEANUP_TEMP=false
fi

# 显示备份信息
if [ -f "${BACKUP_FILE%.*}.meta" ]; then
    log_info "备份信息:"
    cat "${BACKUP_FILE%.*}.meta"
    echo ""
fi

# 创建恢复前的备份
log_info "创建恢复前的安全备份..."
SAFETY_BACKUP="backups/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges > "$SAFETY_BACKUP"
log_success "安全备份已创建: $SAFETY_BACKUP"

# 执行数据库恢复
log_info "正在恢复数据库..."

# 方法1: 使用 psql 直接执行
if psql "$SUPABASE_DB_URL" -f "$BACKUP_FILE"; then
    log_success "数据库恢复成功!"
else
    log_error "数据库恢复失败!"
    
    # 如果恢复失败，尝试恢复安全备份
    log_warning "尝试恢复安全备份..."
    if psql "$SUPABASE_DB_URL" -f "$SAFETY_BACKUP"; then
        log_success "已恢复到恢复前的状态"
    else
        log_error "恢复安全备份也失败了，请手动检查数据库状态"
    fi
    
    exit 1
fi

# 清理临时文件
if [ "$CLEANUP_TEMP" = true ]; then
    rm -f "$TEMP_FILE"
fi

log_success "数据库恢复完成!"

# 显示恢复后的信息
log_info "恢复后的数据库信息:"
echo "  备份文件: $1"
echo "  安全备份: $SAFETY_BACKUP"
echo "  恢复时间: $(date)"

# 验证恢复结果
log_info "验证数据库连接..."
if psql "$SUPABASE_DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    log_success "数据库连接正常"
else
    log_warning "数据库连接验证失败，请手动检查"
fi

echo ""
log_info "🔄 如需回滚到恢复前状态:"
echo "   ./scripts/restore_db.sh $SAFETY_BACKUP"
