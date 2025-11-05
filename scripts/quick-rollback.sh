#!/bin/bash

# 快速回滚脚本
# 用法: ./scripts/quick-rollback.sh [日期]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取回滚日期
ROLLBACK_DATE=${1:-$(date +%Y%m%d)}

echo -e "${GREEN}🚀 开始快速回滚...${NC}"
echo -e "${YELLOW}回滚日期: ${ROLLBACK_DATE}${NC}"

# 检查回滚脚本是否存在
ROLLBACK_SCRIPT="db/rollback/${ROLLBACK_DATE}.sql"
if [ ! -f "$ROLLBACK_SCRIPT" ]; then
    echo -e "${RED}❌ 回滚脚本不存在: ${ROLLBACK_SCRIPT}${NC}"
    echo -e "${YELLOW}可用的回滚脚本:${NC}"
    ls -la db/rollback/*.sql 2>/dev/null || echo "  无可用脚本"
    exit 1
fi

echo -e "${GREEN}📄 找到回滚脚本: ${ROLLBACK_SCRIPT}${NC}"

# 确认回滚
read -p "确认执行回滚吗？这将修改数据库！(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}回滚已取消${NC}"
    exit 0
fi

# 执行回滚
echo -e "${GREEN}📋 执行回滚脚本...${NC}"
node scripts/execute-rollback.js "$ROLLBACK_DATE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 回滚完成！${NC}"
else
    echo -e "${RED}❌ 回滚失败！${NC}"
    exit 1
fi
