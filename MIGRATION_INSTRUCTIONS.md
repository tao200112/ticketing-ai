# 数据库迁移指南

## 问题说明
Events 可能因为数据库缺少 `sort_order` 列而无法正常显示。需要先运行数据库迁移。

## 迁移步骤

### 方法 1: 通过 Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 复制 `supabase/migrations/add_sort_order_to_events_and_activities.sql` 的全部内容
5. 粘贴到 SQL Editor
6. 点击 **Run** 执行

### 方法 2: 通过命令行（如果配置了 Supabase CLI）

```bash
# 确保已安装 Supabase CLI
npm install -g supabase

# 链接到项目
supabase link --project-ref your-project-ref

# 运行迁移
supabase db push
```

## 验证迁移是否成功

执行以下 SQL 查询验证：

```sql
-- 检查 sort_order 列是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name = 'sort_order';

-- 检查 events 数据
SELECT id, title, sort_order, created_at 
FROM events 
ORDER BY sort_order, created_at DESC 
LIMIT 10;
```

## 如果迁移失败

如果遇到错误，请检查：
1. 数据库连接是否正常
2. 是否有足够的权限执行 ALTER TABLE
3. 表是否已存在

## 注意事项

- 迁移是**安全的**，只会添加新列，不会删除任何数据
- 现有 events 的 `sort_order` 会被设置为 999999（默认值）
- 前 3 个 events 会自动设置为 sort_order 1, 2, 3

