# 事件详情页 404 问题排查指南

## 问题描述
创建新活动后，主页和事件详情页无法访问（404 错误），但商家页面和管理员页面可以正常查看和编辑。

## 排查步骤

### 步骤 1: 使用诊断 API

访问诊断端点（将 `YOUR_EVENT_ID` 替换为实际的事件 ID）：

```
https://ticketing-ai-six.vercel.app/api/events/YOUR_EVENT_ID/debug
```

诊断 API 会返回：
- Supabase 配置状态
- 简单查询结果
- 关联查询结果
- 其他事件数量
- 该事件的 prices 数据

### 步骤 2: 检查数据库中事件是否存在

在 Supabase Dashboard 的 SQL Editor 中运行：

```sql
-- 查看所有事件
SELECT id, title, status, created_at
FROM events
ORDER BY created_at DESC
LIMIT 10;

-- 检查特定事件（替换为实际的事件 ID）
SELECT *
FROM events
WHERE id = '62c7b850-1a67-466d-9bca-6ab72414ea65';
```

### 步骤 3: 检查 RLS 策略

运行以下 SQL 检查 RLS 策略：

```sql
-- 检查 events 表的 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'events';

-- 检查 RLS 是否启用
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'events';
```

### 步骤 4: 检查 Supabase 环境变量

在 Vercel Dashboard 中检查以下环境变量是否正确配置：

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`（推荐配置）

### 步骤 5: 查看 Vercel 日志

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 选择项目
3. 进入 **Functions** 或 **Logs** 标签
4. 查看 `/api/events/[id]` 的错误日志
5. 查找以下关键信息：
   - `Event detail API called` - 确认 API 被调用
   - `Simple query failed` - 简单查询失败原因
   - `Error fetching event` - 完整错误信息

## 常见问题和解决方案

### 问题 1: 事件不存在于数据库

**症状**: 诊断 API 显示 `eventExists: false`

**解决方案**:
1. 确认事件确实在数据库中
2. 检查事件 ID 是否正确（UUID 格式）
3. 如果事件在商家页面能看到，检查是否有权限问题

### 问题 2: RLS 权限问题

**症状**: 诊断 API 显示 `eventAccessible: false`，错误代码为 `42501`

**解决方案**: 运行数据迁移脚本 `fix_events_data_migration.sql`

### 问题 3: 关联查询失败

**症状**: `simpleQuery` 成功但 `relationQuery` 失败

**解决方案**:
1. 检查 `prices` 表的 RLS 策略
2. 检查 `merchants` 表的 RLS 策略
3. 运行迁移脚本确保策略正确

### 问题 4: 参数解析问题

**症状**: API 日志显示 `Event ID is missing`

**解决方案**: 
- 已修复：现在 API 会从 URL 中提取事件 ID 作为备用方案
- 如果仍然失败，检查 Next.js 版本和路由配置

## 快速修复脚本

如果确定是 RLS 问题，运行以下 SQL 快速修复：

```sql
-- 临时禁用 RLS（仅用于测试）
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;
```

**⚠️ 警告**: 这会禁用所有 RLS 策略，仅用于测试。生产环境应该使用正确的 RLS 策略。

## 完整数据迁移

运行完整的数据迁移脚本：

```sql
-- 执行 fix_events_data_migration.sql
```

该脚本会：
1. 确保所有事件都有正确的 `status` 值
2. 配置正确的 RLS 策略
3. 创建必要的索引

## 验证修复

修复后，验证以下内容：

1. **诊断 API** 应该返回 `eventExists: true` 和 `eventAccessible: true`
2. **事件详情页** 应该能正常加载
3. **主页** 应该能显示事件列表

## 如果问题仍然存在

请提供以下信息：

1. 诊断 API 的完整响应（`/api/events/[id]/debug`）
2. Vercel 日志中的错误信息
3. 数据库中该事件的完整记录
4. RLS 策略的当前配置

