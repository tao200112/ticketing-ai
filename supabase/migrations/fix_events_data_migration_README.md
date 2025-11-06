# 事件数据迁移说明

## 问题描述
主页和事件详情页无法访问，但商家页面和管理员页面可以正常查看和编辑活动。这可能是由于：
1. `status` 字段为 `NULL`，导致过滤查询失败
2. RLS（Row Level Security）策略限制了公开访问
3. 关联表（prices, merchants）的 RLS 策略问题

## 迁移文件
`fix_events_data_migration.sql`

## 执行步骤

### 方法 1: 通过 Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 点击 **New query**
5. 复制 `fix_events_data_migration.sql` 的全部内容
6. 粘贴到 SQL Editor
7. 点击 **Run** 执行

### 方法 2: 通过 Supabase CLI

```bash
# 确保已安装 Supabase CLI
supabase db push

# 或者直接执行 SQL
supabase db execute --file supabase/migrations/fix_events_data_migration.sql
```

## 迁移内容

### 1. 确保 status 字段存在
- 如果不存在，添加 `status` 字段，默认值为 `'published'`
- 添加 CHECK 约束，允许的值：`'draft'`, `'published'`, `'cancelled'`, `'completed'`, 或 `NULL`

### 2. 更新 NULL 状态
- 将所有 `status` 为 `NULL` 的事件更新为 `'published'`

### 3. 修复缺失字段
- 如果 `title` 为空，设置为默认值
- 如果 `created_at` 为 `NULL`，设置为当前时间

### 4. 配置 RLS 策略
- **events 表**: 允许所有人（public）读取所有事件
- **prices 表**: 允许所有人读取价格信息
- **merchants 表**: 允许所有人读取商家信息（用于关联查询）

### 5. 创建索引
- `idx_events_status`: 提升按状态查询的性能
- `idx_events_created_at`: 提升按创建时间排序的性能
- `idx_prices_event_id`: 提升关联查询的性能

## 验证

执行迁移后，运行以下 SQL 验证：

```sql
-- 检查所有事件的状态
SELECT status, COUNT(*) as count
FROM events
GROUP BY status
ORDER BY count DESC;

-- 检查是否有 NULL 状态
SELECT COUNT(*) as null_status_count
FROM events
WHERE status IS NULL;

-- 测试查询（应该返回所有事件）
SELECT id, title, status
FROM events
ORDER BY created_at DESC
LIMIT 10;
```

## 注意事项

⚠️ **安全提示**: 
- 当前 RLS 策略允许所有人读取所有事件，包括草稿状态
- 如果只想允许已发布的事件，可以修改策略为：
  ```sql
  USING (status = 'published' OR status IS NULL)
  ```

## 回滚（如果需要）

如果需要回滚，可以执行：

```sql
-- 恢复更严格的 RLS 策略（只允许已发布的事件）
DROP POLICY IF EXISTS "Allow public read access to events" ON events;
CREATE POLICY "Allow public read access to published events"
ON events FOR SELECT
TO public
USING (status = 'published' OR status IS NULL);
```

## 故障排查

如果迁移后仍然无法访问：

1. **检查 RLS 是否启用**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('events', 'prices', 'merchants');
   ```

2. **检查策略是否存在**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('events', 'prices', 'merchants');
   ```

3. **使用诊断 API**:
   ```
   https://your-domain.com/api/events/[event-id]/debug
   ```

