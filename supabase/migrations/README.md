# 🗄️ 数据库迁移指南

本目录包含 Supabase 数据库迁移文件，用于版本控制和数据库结构管理。

## 📁 文件结构

```
supabase/migrations/
├── README.md                    # 本文件
├── 20241025_001_initial_setup.sql    # 初始设置
├── 20241025_002_add_users_table.sql  # 用户表
└── 20241025_003_add_events_table.sql # 事件表
```

## 🔄 迁移文件命名规则

格式：`YYYYMMDD_HHMMSS_description.sql`

- `YYYYMMDD`: 日期
- `HHMMSS`: 时间（可选）
- `description`: 描述性名称

## 📝 迁移文件模板

### 创建新迁移

```sql
-- ============================================
-- 🗄️  迁移: 添加用户表
-- ============================================
-- 创建时间: 2024-10-25
-- 描述: 创建用户表和相关索引
-- ============================================

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);
```

### 回滚迁移

```sql
-- ============================================
-- 🔄 回滚: 删除用户表
-- ============================================
-- 创建时间: 2024-10-25
-- 描述: 删除用户表和相关数据
-- ============================================

-- 删除 RLS 策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 删除索引
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_created_at;

-- 删除表
DROP TABLE IF EXISTS users;
```

## 🚀 使用方法

### 应用迁移

```bash
# 应用所有迁移
psql "$SUPABASE_DB_URL" -f supabase/migrations/20241025_001_initial_setup.sql

# 应用特定迁移
psql "$SUPABASE_DB_URL" -f supabase/migrations/20241025_002_add_users_table.sql
```

### 回滚迁移

```bash
# 回滚特定迁移
psql "$SUPABASE_DB_URL" -f supabase/migrations/20241025_002_add_users_table_rollback.sql
```

### 批量应用迁移

```bash
# 应用所有迁移（按顺序）
for file in supabase/migrations/*.sql; do
    echo "应用迁移: $file"
    psql "$SUPABASE_DB_URL" -f "$file"
done
```

## ⚠️ 注意事项

1. **备份优先**: 执行迁移前务必备份数据库
2. **测试环境**: 先在测试环境验证迁移
3. **原子操作**: 每个迁移文件应该是原子的
4. **回滚准备**: 为每个迁移准备回滚脚本
5. **版本控制**: 所有迁移文件必须提交到版本控制

## 🔧 最佳实践

### 1. 迁移前检查

```sql
-- 检查表是否存在
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'users'
);
```

### 2. 安全迁移

```sql
-- 使用 IF NOT EXISTS 避免重复创建
CREATE TABLE IF NOT EXISTS users (...);

-- 使用 IF EXISTS 避免删除不存在的对象
DROP TABLE IF EXISTS old_table;
```

### 3. 数据迁移

```sql
-- 迁移数据时使用事务
BEGIN;

-- 创建新表结构
CREATE TABLE new_users (...);

-- 迁移数据
INSERT INTO new_users SELECT * FROM old_users;

-- 重命名表
ALTER TABLE users RENAME TO users_old;
ALTER TABLE new_users RENAME TO users;

COMMIT;
```

## 📊 迁移状态跟踪

### 创建迁移记录表

```sql
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    UNIQUE(migration_name)
);
```

### 记录迁移

```sql
INSERT INTO migration_history (migration_name, checksum)
VALUES ('20241025_001_initial_setup', 'abc123...');
```

## 🆘 故障排除

### 常见问题

1. **迁移失败**: 检查 SQL 语法和权限
2. **重复执行**: 使用 IF NOT EXISTS/IF EXISTS
3. **数据丢失**: 立即恢复备份
4. **权限问题**: 检查 RLS 策略

### 紧急回滚

```bash
# 1. 停止应用
# 2. 恢复数据库备份
./scripts/restore_db.sh backups/latest_backup.sql

# 3. 检查数据完整性
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM users;"
```

---

*最后更新: 2024年10月25日*