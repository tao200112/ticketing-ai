# Webhook Supabase UID 修复

## 🐛 问题描述

新购买的票无法自动更新 `supabase_uid`，新票一直是 null。

## 🔍 根本原因

1. **Stripe metadata 限制**：Stripe metadata 不支持 `null` 值，会将 `null` 转换为空字符串 `''`
2. **Webhook 读取问题**：Webhook 读取 metadata 时，空字符串没有被正确处理
3. **UUID 验证缺失**：没有验证从 metadata 读取的 `supabase_uid` 是否是有效的 UUID 格式

## ✅ 修复内容

### 1. 修复 `app/api/checkout_sessions/route.js`

**修改：**
- ✅ 确保 `supabase_uid` 写入 metadata 时，如果是 null 则使用空字符串（Stripe 要求）
- ✅ 添加日志确认 `supabase_uid` 的值

```javascript
metadata: {
  // ...
  supabase_uid: supabaseUid || '', // Stripe metadata 不支持 null，使用空字符串作为占位符
  // ...
}
```

### 2. 修复 `app/api/webhook/route.js`

**修改：**
- ✅ 正确处理空字符串：将 `''`, `'null'`, `'undefined'` 转换为 `null`
- ✅ 添加 UUID 格式验证：确保 `supabase_uid` 是有效的 UUID
- ✅ 添加详细的调试日志：记录原始值和处理后的值
- ✅ 增强票务创建日志：记录插入的数据和创建后的验证

```javascript
// 处理空字符串（Stripe metadata 不支持 null，会转换为空字符串）
let supabaseUid = session.metadata?.supabase_uid || null
if (supabaseUid === '' || supabaseUid === 'null' || supabaseUid === 'undefined') {
  supabaseUid = null
}

// 验证 UUID 格式
if (supabaseUid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(supabaseUid)) {
    console.warn('[Webhook] ⚠️ supabase_uid in metadata is not a valid UUID:', supabaseUid)
    supabaseUid = null
  }
}
```

## 🔄 数据流

```
Checkout Sessions API
  ↓ supabaseUid = <uuid> 或 null
  ↓ metadata: { supabase_uid: supabaseUid || '' }
  ↓
Stripe Checkout Session
  ↓ metadata.supabase_uid = <uuid> 或 ''
  ↓
Webhook API
  ↓ 读取 session.metadata.supabase_uid
  ↓ 处理空字符串 → null
  ↓ 验证 UUID 格式
  ↓ supabaseUid = <uuid> 或 null
  ↓
创建订单和票务
  ↓ supabase_uid: supabaseUid
```

## 🧪 测试步骤

### 测试 1: 正常购买流程

1. **确保用户已登录**
2. **购买一张票**
3. **查看 Vercel Logs**，应该看到：
   ```
   [CheckoutSessions] supabase_uid = <uuid>
   [Webhook] Raw supabase_uid from metadata: <uuid>
   [Webhook] Processed supabase_uid = <uuid>
   [Webhook] Creating ticket with supabase_uid: <uuid>
   ✅ 票据创建成功: { ticket_id: ..., supabase_uid: <uuid> }
   ✅ [Webhook] Ticket supabase_uid verified: <uuid>
   ```

### 测试 2: 验证数据库

在 Supabase SQL Editor 中执行：
```sql
-- 查看最新创建的票
SELECT 
  id,
  short_id,
  holder_email,
  supabase_uid,
  created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 5;

-- 验证 supabase_uid 不为 null
SELECT 
  COUNT(*) as total,
  COUNT(supabase_uid) as with_uid,
  COUNT(*) - COUNT(supabase_uid) as without_uid
FROM tickets
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**预期结果：** 最新票的 `supabase_uid` 应该不为 null

### 测试 3: 检查 Stripe Dashboard

1. **打开 Stripe Dashboard**
2. **找到最新的 checkout session**
3. **查看 metadata**，确认 `supabase_uid` 字段存在且不为空

## 📋 调试日志说明

### Checkout Sessions 日志

```
[CheckoutSessions] supabase_uid = <uuid>
[CheckoutSessions] user email = <email>
[CheckoutSessions] hasAuth = true
```

### Webhook 日志

```
[Webhook] Raw supabase_uid from metadata: <uuid>
[Webhook] Processed supabase_uid = <uuid>
[Webhook] Full session.metadata = {...}
[Webhook] Creating ticket with supabase_uid: <uuid>
[Webhook] Ticket data to insert: { supabase_uid: <uuid>, ... }
✅ 票据创建成功: { ticket_id: ..., supabase_uid: <uuid> }
✅ [Webhook] Ticket supabase_uid verified: <uuid>
```

### 如果出现问题

如果看到以下日志，说明有问题：

```
[Webhook] Raw supabase_uid from metadata: ''  ← 空字符串
[Webhook] Processed supabase_uid = null  ← 转换为 null
[Webhook] ⚠️ Missing supabase_uid in metadata!  ← 警告
```

或者：

```
[Webhook] ⚠️ supabase_uid in metadata is not a valid UUID: <invalid_value>
```

## ⚠️ 注意事项

1. **Stripe metadata 限制**
   - Stripe metadata 不支持 `null` 值
   - 所有值都会被转换为字符串
   - 空字符串 `''` 需要被正确处理

2. **UUID 验证**
   - 只接受有效的 UUID 格式
   - 如果格式不正确，会被设置为 `null`

3. **回退机制**
   - 如果 metadata 中没有 `supabase_uid`，会尝试通过邮箱查找
   - 如果仍然找不到，会拒绝创建订单和票务

## 🔗 相关文件

- `app/api/checkout_sessions/route.js` - Checkout Sessions API
- `app/api/webhook/route.js` - Webhook API

