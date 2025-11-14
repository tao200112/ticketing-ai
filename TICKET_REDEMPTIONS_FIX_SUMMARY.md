# Ticket Redemptions Supabase UID 修复总结

## 📋 修复内容

### 1. 数据库迁移文件

**文件：** `supabase/migrations/20250115_fix_ticket_redemptions_supabase_uid.sql`

**变更：**
- ✅ 添加 `ticket_redemptions.supabase_uid` 字段
- ✅ 添加 `ticket_redemptions.redeemed_by_supabase_uid` 字段
- ✅ 添加 `tickets.redeemed_by_supabase_uid` 字段
- ✅ 迁移现有数据（从 `user_id` 和 `redeemed_by` 迁移到 `supabase_uid`）
- ✅ 创建索引
- ✅ 标记旧字段为 DEPRECATED
- ✅ 更新 RLS 策略

### 2. API 代码更新

#### 2.1 客户核销 API

**文件：** `app/api/tickets/use/route.js`

**变更：**
- ✅ 使用 `getServerUser()` 获取当前用户的 `supabase_uid`
- ✅ 更新 ticket 查询，包含 `supabase_uid` 字段
- ✅ 更新 order 查询，包含 `supabase_uid` 字段
- ✅ 使用 `supabase_uid` 验证票务所有权
- ✅ 更新 ticket 更新逻辑，写入 `redeemed_by_supabase_uid`
- ✅ 更新 `ticket_redemptions` 插入逻辑，使用 `supabase_uid` 和 `redeemed_by_supabase_uid`

**关键代码：**
```javascript
// 获取当前用户
const authUser = await getServerUser()
const supabaseUid = authUser?.id || null

// 更新 ticket
.update({
  used: true,
  used_at: now,
  used_method: redeemMethod,
  status: 'used',
  redeemed_by_supabase_uid: supabaseUid
})

// 插入 redemption log
.insert({
  ticket_id: ticket_id,
  supabase_uid: supabaseUid,
  redeemed_by_supabase_uid: supabaseUid,
  // ...
})
```

#### 2.2 商家核销 API

**文件：** `app/api/merchant/redeem/route.js`

**变更：**
- ✅ 使用 `getServerUser()` 获取当前用户的 `supabase_uid`
- ✅ 更新 merchant 查询，包含 `owner_supabase_uid` 字段
- ✅ 更新 merchant_members 查询，使用 `supabase_uid` 而不是 `user_id`
- ✅ 更新 ticket 更新逻辑，写入 `redeemed_by_supabase_uid`
- ✅ 添加 `ticket_redemptions` 插入逻辑，使用 `supabase_uid` 和 `redeemed_by_supabase_uid`

**关键代码：**
```javascript
// 获取当前用户
const authUser = await getServerUser()
const supabaseUid = authUser?.id || null

// 查询 merchant_members（使用 supabase_uid）
.eq('supabase_uid', supabaseUid)

// 更新 ticket
.update({
  status: 'used',
  used: true,
  used_at: now.toISOString(),
  redeemed_by_supabase_uid: supabaseUid,
  // ...
})

// 插入 redemption log
.insert({
  ticket_id: ticketId,
  supabase_uid: ticket.supabase_uid || null,  // 票务所有者
  redeemed_by_supabase_uid: supabaseUid,  // 操作人（商家员工）
  // ...
})
```

## 🔒 RLS 策略更新

**策略：**
1. **`ticket_redemptions_select_own`**: 用户只能查看自己票务的核销记录
2. **`ticket_redemptions_select_merchant`**: 商家员工可以查看他们商家的所有核销记录
3. **`ticket_redemptions_insert_merchant_staff`**: 商家员工可以插入核销记录（操作人必须是当前用户）

## 📊 数据流

### 客户核销流程
```
1. 客户调用 POST /api/tickets/use
2. getServerUser() → 获取 supabase_uid
3. 验证票务所有权（使用 supabase_uid）
4. 更新 tickets 表：
   - used = true
   - redeemed_by_supabase_uid = supabase_uid
5. 插入 ticket_redemptions：
   - supabase_uid = supabase_uid（票务所有者）
   - redeemed_by_supabase_uid = supabase_uid（操作人）
```

### 商家核销流程
```
1. 商家员工调用 POST /api/merchant/redeem
2. getServerUser() → 获取 supabase_uid
3. 验证商家权限（使用 supabase_uid）
4. 更新 tickets 表：
   - used = true
   - redeemed_by_supabase_uid = supabase_uid（商家员工）
5. 插入 ticket_redemptions：
   - supabase_uid = ticket.supabase_uid（票务所有者）
   - redeemed_by_supabase_uid = supabase_uid（商家员工）
```

## ✅ 验证步骤

### 1. 执行迁移
```sql
\i supabase/migrations/20250115_fix_ticket_redemptions_supabase_uid.sql
```

### 2. 测试客户核销
```bash
# 客户核销票务
curl -X POST http://localhost:3000/api/tickets/use \
  -H "Content-Type: application/json" \
  -d '{"ticket_id": "xxx"}'
```

**验证：**
```sql
-- 检查 ticket_redemptions 表
SELECT 
  id,
  ticket_id,
  supabase_uid,
  redeemed_by_supabase_uid,
  redeemed_at
FROM ticket_redemptions
ORDER BY redeemed_at DESC
LIMIT 5;

-- 预期：supabase_uid 和 redeemed_by_supabase_uid 都不为 null
```

### 3. 测试商家核销
```bash
# 商家核销票务
curl -X POST http://localhost:3000/api/merchant/redeem \
  -H "Content-Type: application/json" \
  -d '{"qr_payload": "xxx"}'
```

**验证：**
```sql
-- 检查最新核销记录
SELECT 
  tr.id,
  tr.ticket_id,
  tr.supabase_uid AS ticket_owner_uid,
  tr.redeemed_by_supabase_uid AS operator_uid,
  t.holder_email,
  tr.redeemed_at
FROM ticket_redemptions tr
JOIN tickets t ON t.id = tr.ticket_id
ORDER BY tr.redeemed_at DESC
LIMIT 5;

-- 预期：
-- - supabase_uid = 票务所有者的 supabase_uid
-- - redeemed_by_supabase_uid = 商家员工的 supabase_uid
-- - 两者都不为 null
```

## 📝 废弃字段

以下字段已标记为 DEPRECATED，但保留以保持向后兼容：

- `ticket_redemptions.user_id` → 使用 `supabase_uid`
- `ticket_redemptions.redeemed_by` → 使用 `redeemed_by_supabase_uid`
- `tickets.redeemed_by` → 使用 `redeemed_by_supabase_uid`

## 🔄 迁移顺序

1. **执行数据库迁移**：`20250115_fix_ticket_redemptions_supabase_uid.sql`
2. **部署代码更新**：更新后的 API 文件
3. **验证功能**：测试核销流程
4. **监控日志**：检查是否有错误

## ⚠️ 注意事项

1. **向后兼容**：代码仍支持从 body 中获取 `userId`，但优先使用 `supabase_uid`
2. **数据迁移**：迁移脚本会尝试从现有数据中填充 `supabase_uid`，但可能无法匹配所有记录
3. **RLS 策略**：确保 RLS 策略正确配置，允许商家员工插入核销记录

## 📦 文件清单

### 新增文件
- `supabase/migrations/20250115_fix_ticket_redemptions_supabase_uid.sql`
- `TICKET_REDEMPTIONS_FIX_SUMMARY.md`

### 修改文件
- `app/api/tickets/use/route.js`
- `app/api/merchant/redeem/route.js`

