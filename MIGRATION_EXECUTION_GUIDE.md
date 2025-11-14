# 数据库迁移执行指南

## 📋 执行方式

### 方式 1: 使用合并文件（推荐）

**文件：** `supabase/migrations/20250115_complete_migration.sql`

**步骤：**
1. 打开 Supabase Dashboard → SQL Editor
2. 打开文件 `supabase/migrations/20250115_complete_migration.sql`
3. 复制全部内容
4. 粘贴到 Supabase SQL Editor
5. 点击 "Run" 执行

**优点：** 一次执行所有迁移，确保顺序正确

### 方式 2: 分别执行（如果遇到错误需要调试）

**文件列表（按顺序）：**

1. **`supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql`**
   - 统一用户体系
   - 添加 `supabase_uid` 字段
   - 迁移现有数据

2. **`supabase/migrations/20250115_rebuild_rls_policies.sql`**
   - 重建 RLS 策略
   - 修复安全漏洞

3. **`supabase/migrations/20250115_refactor_tickets_structure.sql`**
   - 重构票务表结构
   - 合并 snapshot 字段为 JSONB

4. **`supabase/migrations/20250115_enum_status_fields.sql`**
   - ENUM 化 status 字段
   - 清理脏数据

5. **`supabase/migrations/20250115_refactor_short_id_nanoid.sql`**
   - 重构 short_id
   - 创建 nanoid 函数

**步骤：**
1. 在 Supabase SQL Editor 中，按顺序打开每个文件
2. 复制内容并执行
3. 等待每个迁移完成后再执行下一个

## 🔗 文件路径

### GitHub 链接（Raw 格式）

如果你的代码已推送到 GitHub，可以使用以下链接：

1. **统一用户体系**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql
   ```

2. **重建 RLS 策略**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_rebuild_rls_policies.sql
   ```

3. **重构票务表结构**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_refactor_tickets_structure.sql
   ```

4. **ENUM 化 status 字段**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_enum_status_fields.sql
   ```

5. **重构 short_id**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_refactor_short_id_nanoid.sql
   ```

6. **完整迁移（推荐）**
   ```
   https://raw.githubusercontent.com/tao200112/ticketing-ai/feat/partytix-mvp/supabase/migrations/20250115_complete_migration.sql
   ```

### 本地文件路径

```
supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql
supabase/migrations/20250115_rebuild_rls_policies.sql
supabase/migrations/20250115_refactor_tickets_structure.sql
supabase/migrations/20250115_enum_status_fields.sql
supabase/migrations/20250115_refactor_short_id_nanoid.sql
supabase/migrations/20250115_complete_migration.sql  ← 推荐使用这个
```

## ⚠️ 重要提醒

1. **备份数据库**
   - 执行迁移前，在 Supabase Dashboard 中备份数据库
   - 或使用 `pg_dump` 导出数据

2. **测试环境先运行**
   - 建议先在测试/开发环境运行
   - 验证无误后再在生产环境执行

3. **执行时间**
   - 完整迁移可能需要几分钟（取决于数据量）
   - 数据迁移步骤可能需要较长时间

4. **监控日志**
   - 执行时查看 Supabase SQL Editor 的输出
   - 注意 `RAISE NOTICE` 和 `RAISE WARNING` 消息

## ✅ 执行后验证

运行测试脚本：
```sql
-- 在 Supabase SQL Editor 中执行
\i supabase/migrations/20250115_test_migration.sql
```

或直接打开文件：
```
supabase/migrations/20250115_test_migration.sql
```

## 📝 执行顺序总结

```
1. 20250115_unify_user_system_to_supabase_uid.sql
   ↓
2. 20250115_rebuild_rls_policies.sql
   ↓
3. 20250115_refactor_tickets_structure.sql
   ↓
4. 20250115_enum_status_fields.sql
   ↓
5. 20250115_refactor_short_id_nanoid.sql
   ↓
6. 20250115_test_migration.sql (验证)
```

**或使用合并文件：**
```
20250115_complete_migration.sql (包含所有 1-5)
   ↓
20250115_test_migration.sql (验证)
```

