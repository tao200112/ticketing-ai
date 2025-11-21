# 🚨 立即运行数据库迁移

## 问题诊断

根据错误信息：`column p.ticket_kind does not exist`

**根本原因**：`prices` 表缺少 `ticket_kind` 列，导致 API 查询失败。

## ✅ 立即修复步骤

### 步骤 1: 在 Supabase SQL Editor 中运行迁移

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 点击左侧菜单的 **"SQL Editor"**
4. 点击 **"New query"**
5. 复制并粘贴以下 SQL：

```sql
-- 快速修复：添加 ticket_kind 列到 prices 表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'prices'
        AND column_name = 'ticket_kind'
    ) THEN
        ALTER TABLE prices
        ADD COLUMN ticket_kind TEXT;
        
        ALTER TABLE prices
        ADD CONSTRAINT prices_ticket_kind_check 
        CHECK (ticket_kind IS NULL OR ticket_kind IN ('entry_18_20', 'entry_21_plus', 'queue', 'drink', 'combo'));
        
        RAISE NOTICE '✅ ticket_kind column added';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prices_ticket_kind ON prices(ticket_kind);
```

6. 点击 **"Run"** 按钮（或按 `Ctrl+Enter`）
7. 等待执行完成，应该看到 "Success. No rows returned"

### 步骤 2: 验证迁移成功

运行以下 SQL 验证：

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'prices'
AND column_name = 'ticket_kind';
```

应该看到一行结果，显示 `ticket_kind` 列已存在。

### 步骤 3: 测试事件查询

运行以下 SQL 测试完整查询（替换为实际的事件 ID）：

```sql
SELECT 
    e.*,
    json_agg(
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'amount_cents', p.amount_cents,
            'inventory', p.inventory,
            'ticket_kind', p.ticket_kind
        )
    ) FILTER (WHERE p.id IS NOT NULL) as prices,
    json_build_object(
        'id', m.id,
        'name', m.name,
        'contact_email', m.contact_email
    ) as merchants
FROM events e
LEFT JOIN prices p ON p.event_id = e.id
LEFT JOIN merchants m ON m.id = e.merchant_id
WHERE e.id = '62c7b850-1a67-466d-9bca-6ab72414ea65'  -- 替换为实际的事件 ID
GROUP BY e.id, m.id, m.name, m.contact_email;
```

如果查询成功，说明迁移完成。

## 📝 已修复的文件

我已经更新了以下文件，使它们兼容 `ticket_kind` 列不存在的情况：

1. ✅ `app/api/events/[id]/route.js` - 移除了 `ticket_kind` 字段（避免查询错误）
2. ✅ `app/api/events/[id]/debug/route.js` - 移除了 `ticket_kind` 字段
3. ✅ `supabase/migrations/add_ticket_kind_to_prices.sql` - 修复了迁移脚本
4. ✅ `supabase/migrations/check_event_exists.sql` - 更新了诊断脚本
5. ✅ `supabase/migrations/diagnose_event_access.sql` - 更新了诊断脚本

## 🔄 迁移完成后

运行迁移后，事件详情页应该可以正常访问了。如果仍有问题，请：

1. 检查 Vercel 日志中的错误信息
2. 访问 `/api/events/[id]/debug` 查看详细诊断信息
3. 确认 RLS 策略已正确配置（从之前的图片看，策略已存在）

## ⚠️ 注意事项

- 迁移脚本是 **幂等的**（可以安全地多次运行）
- 如果 `ticket_kind` 列已存在，迁移不会报错
- 现有数据不会受影响（`ticket_kind` 默认为 `NULL`）

