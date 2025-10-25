# 📝 更新日志

本文档记录了 PartyTix 项目的所有重要变更。

## 🔄 版本管理

- **主版本号 (MAJOR)**: 不兼容的 API 修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

## 📋 变更类型

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

---

## 🚀 版本历史

### [未发布]

#### 🆕 新增
- 可回滚版本管理系统
- 自动数据库备份功能
- GitHub Actions 自动发布流程
- 版本号显示组件
- 快速回滚脚本

#### 🔧 改进
- 优化构建流程
- 增强错误处理
- 改进开发体验

#### 🐛 修复
- 修复版本显示问题
- 修复构建配置

---

## 🔄 回滚指南

### Git 回滚
```bash
# 回滚到上一个版本
git revert -m 1 <merge_sha>
git push origin main

# 快速回滚脚本
./scripts/quick_rollback.sh
```

### Vercel 回滚
```bash
# 查看部署历史
vercel ls

# 回滚到指定部署
vercel promote <deployment_id>
```

### 数据库回滚
```bash
# 恢复数据库备份
./scripts/restore_db.sh backups/backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 统计信息

- **总提交数**: 自动统计
- **贡献者**: 自动统计
- **最后更新**: 自动更新

---

*此文件由 GitHub Actions 自动生成和更新*
