# 代码库清理计划

## 清理目标
1. 删除未使用的测试和调试文件
2. 整理文档到docs目录
3. 删除重复的配置文件
4. 保持应用功能完整

## 文件分类

### 可删除的测试文件（根目录）
- test-*.js
- test-*.html
- debug-*.js
- debug-*.html
- check-*.js
- fix-*.js (根目录下的)
- verify-*.js
- simple-*.html
- add-test-data.html

### 可删除的SQL脚本（根目录，保留supabase/migrations中的）
- *.sql (根目录下，除了supabase/migrations中的)

### 可删除的重复Dockerfile
- Dockerfile.backend.fixed
- Dockerfile.backend.no-cache
- Dockerfile.backend.simple

### 可删除的临时文件
- validation-report-*.json
- events.json (如果是测试数据)

### 文档整理
- 将修复报告、总结文档移动到docs/archive/
- 保留重要文档：README.md, CHANGELOG.md, 主要部署指南

