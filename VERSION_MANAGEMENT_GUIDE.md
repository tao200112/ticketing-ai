# 🔄 版本管理系统使用指南

本指南详细说明如何使用 PartyTix 项目的版本管理系统，实现 1 分钟内快速回滚到上一个稳定版本。

## 🚀 快速开始

### 1. 初始化版本管理系统

```bash
# 运行设置脚本
npm run setup:version

# 或直接执行
./scripts/setup_version_management.sh
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env.local

# 编辑环境变量
# 必须配置 SUPABASE_DB_URL 用于数据库备份
```

## 📋 日常使用流程

### 开发新功能

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发并提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建 Pull Request 到 main 分支
```

### 发布新版本

```bash
# 1. 合并到 main 分支（通过 PR）
git checkout main
git pull origin main

# 2. 自动触发 GitHub Actions
# - 自动创建版本标签
# - 自动生成 CHANGELOG.md
# - 自动部署到 Vercel
# - 自动备份数据库
```

## 🔄 回滚操作

### 方法 1: 一键快速回滚

```bash
# 快速回滚到上一个稳定版本
npm run rollback

# 或直接执行
./scripts/quick_rollback.sh
```

### 方法 2: Vercel Dashboard 回滚

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 → Deployments
3. 找到要回滚的版本
4. 点击 "Promote to Production"

### 方法 3: CLI 回滚

```bash
# 查看部署历史
vercel ls

# 回滚到指定部署
vercel promote <deployment_id>
```

### 方法 4: Git 回滚

```bash
# 查看提交历史
git log --oneline -10

# 回滚到指定提交
git revert -m 1 <commit_sha>
git push origin main
```

## 🗄️ 数据库管理

### 备份数据库

```bash
# 手动备份
npm run backup:db

# 或直接执行
./scripts/backup_db.sh

# 查看备份列表
ls -la backups/
```

### 恢复数据库

```bash
# 恢复指定备份
npm run restore:db backups/backup_20241025_143022.sql

# 或直接执行
./scripts/restore_db.sh backups/backup_20241025_143022.sql
```

### 自动备份

- 每次推送到 `main` 分支时自动备份数据库
- 备份文件保存在 `backups/` 目录
- 自动清理超过 30 天的旧备份

## 📊 版本管理

### 查看版本信息

```bash
# 查看当前版本
npm run version:check

# 查看所有版本
npm run version:list

# 查看版本历史
git log --oneline --decorate
```

### 版本号规则

- **主版本号 (MAJOR)**: 不兼容的 API 修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

### 自动版本管理

- `feat:` 提交 → 次版本号 +1
- `fix:` 提交 → 修订号 +1
- 其他提交 → 修订号 +1

## 🛠️ 开发工具

### 可用脚本

```bash
# 版本管理
npm run setup:version    # 初始化版本管理系统
npm run version:check    # 查看当前版本
npm run version:list     # 列出所有版本

# 数据库管理
npm run backup:db       # 备份数据库
npm run restore:db      # 恢复数据库

# 回滚操作
npm run rollback        # 快速回滚
```

### Git 钩子

- **pre-commit**: 自动运行代码检查
- **commit-msg**: 验证提交信息格式

### 提交信息格式

```
type(scope): description

类型:
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码格式
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程

示例:
feat: 添加用户登录功能
fix: 修复支付流程问题
docs: 更新 API 文档
```

## 🔧 配置说明

### 环境变量

```bash
# 必需变量
SUPABASE_DB_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 可选变量
VERCEL_TOKEN=your_vercel_token
STRIPE_SECRET_KEY=sk_test_...
```

### GitHub Actions 配置

- 自动构建和测试
- 自动创建版本标签
- 自动生成 CHANGELOG.md
- 自动创建 GitHub Release
- 自动备份数据库

## 🚨 紧急情况处理

### 生产环境问题

1. **立即回滚**:
   ```bash
   ./scripts/quick_rollback.sh
   ```

2. **检查数据库**:
   ```bash
   ./scripts/backup_db.sh  # 先备份当前状态
   ```

3. **恢复数据**:
   ```bash
   ./scripts/restore_db.sh backups/latest_backup.sql
   ```

### 数据丢失恢复

1. **停止应用**
2. **恢复数据库备份**
3. **验证数据完整性**
4. **重新部署**

## 📚 最佳实践

### 1. 开发流程

- 使用功能分支开发
- 提交前运行代码检查
- 使用规范的提交信息
- 通过 PR 合并到 main

### 2. 发布流程

- 先在测试环境验证
- 小批量发布
- 监控关键指标
- 准备回滚方案

### 3. 回滚策略

- 保持多个备份点
- 测试回滚流程
- 准备应急方案
- 记录回滚原因

## 🔍 故障排除

### 常见问题

1. **回滚失败**: 检查 Git 状态和权限
2. **数据库连接失败**: 检查环境变量配置
3. **备份失败**: 检查 PostgreSQL 客户端
4. **版本标签冲突**: 手动删除冲突标签

### 调试命令

```bash
# 检查 Git 状态
git status
git log --oneline -5

# 检查环境变量
echo $SUPABASE_DB_URL

# 测试数据库连接
psql "$SUPABASE_DB_URL" -c "SELECT 1;"

# 查看备份文件
ls -la backups/
```

## 📞 支持

如有问题，请查看：

- [README.md](README.md) - 项目说明
- [CHANGELOG.md](CHANGELOG.md) - 更新日志
- [supabase/migrations/README.md](supabase/migrations/README.md) - 数据库迁移指南

---

*最后更新: 2024年10月25日*
