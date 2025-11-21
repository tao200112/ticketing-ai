# 商家认证系统迁移指南

## ⚠️ 重要提示

在运行迁移之前，请**务必**先运行审计脚本收集所有信息，然后根据结果调整迁移脚本。

## 迁移步骤

### 步骤 1: 运行全面审计

在 Supabase Dashboard 的 SQL Editor 中运行：

```sql
-- 运行 scripts/comprehensive-merchant-audit.sql
```

**保存所有查询结果**，特别是：
- Merchants 表结构
- 所有 RLS 策略列表
- 约束和索引列表
- 数据统计

### 步骤 2: 检查审计结果

根据审计结果，确认：

1. **需要删除的策略**：列出所有依赖 `owner_supabase_uid` 或 `owner_user_id` 的策略
2. **需要保留的策略**：列出不依赖这些列的策略（需要重新创建）
3. **数据迁移**：确认有多少记录需要迁移 `contact_email` 到 `email`

### 步骤 3: 备份数据（强烈推荐）

```sql
-- 创建备份表
CREATE TABLE merchants_backup_20250116 AS SELECT * FROM merchants;
```

### 步骤 4: 调整迁移脚本

根据审计结果，修改 `scripts/generate-safe-migration.sql`：

1. **策略删除部分**：确认动态删除逻辑能捕获所有策略
2. **数据迁移部分**：根据实际数据调整迁移逻辑
3. **约束添加部分**：确认不会与现有约束冲突

### 步骤 5: 运行迁移

在 Supabase Dashboard 的 SQL Editor 中运行：

```sql
-- 运行 scripts/generate-safe-migration.sql
```

### 步骤 6: 验证迁移结果

检查：
- ✅ 新列已添加（`email`、`password_hash`）
- ✅ 旧列已删除（`owner_supabase_uid`、`owner_user_id`、`contact_email`、`contact_phone`）
- ✅ 数据已迁移（`contact_email` → `email`）
- ✅ 约束已添加（`email` 唯一约束）
- ✅ 索引已创建

### 步骤 7: 测试应用功能

测试以下功能确保没有破坏：
- 商家注册
- 商家登录
- 商家信息查询
- 活动创建和管理
- 票务核销

## 回滚方案

如果迁移出现问题，可以回滚：

```sql
-- 恢复数据
DROP TABLE IF EXISTS merchants;
ALTER TABLE merchants_backup_20250116 RENAME TO merchants;

-- 或者从备份恢复
CREATE TABLE merchants AS SELECT * FROM merchants_backup_20250116;
```

## 常见问题

### Q: 迁移时提示策略不存在
A: 这是正常的，`DROP POLICY IF EXISTS` 会忽略不存在的策略。

### Q: 迁移后某些功能不工作
A: 检查是否删除了需要保留的策略，需要根据业务逻辑重新创建。

### Q: 数据迁移不完整
A: 检查是否有 `contact_email` 为 NULL 的记录，这些记录需要手动处理。

## 联系支持

如果遇到问题，请提供：
1. 审计脚本的完整输出
2. 迁移脚本的错误信息
3. 受影响的功能描述

