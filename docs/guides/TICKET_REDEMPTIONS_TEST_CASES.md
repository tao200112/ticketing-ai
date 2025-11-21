# Ticket Redemptions 测试用例

## 🧪 测试场景

### 测试 1: 客户核销票务

**前置条件：**
- 用户已登录（有有效的 Supabase Auth session）
- 用户拥有一张未使用的票务

**测试步骤：**
1. 调用 `POST /api/tickets/use`
2. 传递 `ticket_id` 在请求 body 中

**请求示例：**
```bash
curl -X POST http://localhost:3000/api/tickets/use \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=xxx" \
  -d '{
    "ticket_id": "292716eb-a421-43b8-9331-1c9e1ff62c34"
  }'
```

**预期结果：**
1. ✅ 返回 `200 OK`
2. ✅ `tickets` 表更新：
   - `used = true`
   - `used_at` 不为 null
   - `redeemed_by_supabase_uid` = 当前用户的 supabase_uid
   - `status = 'used'`
3. ✅ `ticket_redemptions` 表插入新记录：
   - `supabase_uid` = 当前用户的 supabase_uid（票务所有者）
   - `redeemed_by_supabase_uid` = 当前用户的 supabase_uid（操作人）
   - `ticket_id` = 传入的 ticket_id
   - `redeemed_at` 不为 null

**验证 SQL：**
```sql
-- 检查 ticket 更新
SELECT 
  id,
  short_id,
  used,
  used_at,
  redeemed_by_supabase_uid,
  status
FROM tickets
WHERE id = '292716eb-a421-43b8-9331-1c9e1ff62c34';

-- 检查 redemption log
SELECT 
  id,
  ticket_id,
  supabase_uid,
  redeemed_by_supabase_uid,
  redeemed_at,
  redeem_source
FROM ticket_redemptions
WHERE ticket_id = '292716eb-a421-43b8-9331-1c9e1ff62c34'
ORDER BY redeemed_at DESC
LIMIT 1;
```

**预期输出：**
- `tickets.redeemed_by_supabase_uid` 不为 null
- `ticket_redemptions.supabase_uid` 不为 null
- `ticket_redemptions.redeemed_by_supabase_uid` 不为 null

---

### 测试 2: 商家员工核销票务

**前置条件：**
- 商家员工已登录（有有效的 Supabase Auth session）
- 商家员工是目标商家的成员或所有者
- 票务属于该商家的活动

**测试步骤：**
1. 调用 `POST /api/merchant/redeem`
2. 传递 `qr_payload` 在请求 body 中

**请求示例：**
```bash
curl -X POST http://localhost:3000/api/merchant/redeem \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=xxx" \
  -d '{
    "qr_payload": "TKT:xxx:xxx:xxx"
  }'
```

**预期结果：**
1. ✅ 返回 `200 OK`
2. ✅ `tickets` 表更新：
   - `used = true`
   - `used_at` 不为 null
   - `redeemed_by_supabase_uid` = 商家员工的 supabase_uid
   - `status = 'used'`
3. ✅ `ticket_redemptions` 表插入新记录：
   - `supabase_uid` = 票务所有者的 supabase_uid（从 ticket.supabase_uid 获取）
   - `redeemed_by_supabase_uid` = 商家员工的 supabase_uid
   - `ticket_id` = 从 QR payload 解析的 ticket_id
   - `redeemed_at` 不为 null
   - `redeem_source = 'merchant_scan'`

**验证 SQL：**
```sql
-- 检查 ticket 更新
SELECT 
  t.id,
  t.short_id,
  t.used,
  t.used_at,
  t.redeemed_by_supabase_uid AS operator_uid,
  t.supabase_uid AS owner_uid,
  t.status
FROM tickets t
WHERE t.id = 'xxx'  -- 从 QR payload 解析的 ticket_id
LIMIT 1;

-- 检查 redemption log
SELECT 
  tr.id,
  tr.ticket_id,
  tr.supabase_uid AS ticket_owner_uid,
  tr.redeemed_by_supabase_uid AS operator_uid,
  tr.redeemed_at,
  tr.redeem_source,
  tr.redeem_location
FROM ticket_redemptions tr
WHERE tr.ticket_id = 'xxx'  -- 从 QR payload 解析的 ticket_id
ORDER BY tr.redeemed_at DESC
LIMIT 1;
```

**预期输出：**
- `tickets.redeemed_by_supabase_uid` = 商家员工的 supabase_uid（不为 null）
- `ticket_redemptions.supabase_uid` = 票务所有者的 supabase_uid（可能为 null，如果票务没有 supabase_uid）
- `ticket_redemptions.redeemed_by_supabase_uid` = 商家员工的 supabase_uid（不为 null）

---

### 测试 3: 验证 RLS 策略

**测试场景 3.1: 用户只能查看自己票务的核销记录**

**前置条件：**
- 用户 A 已登录
- 用户 A 拥有一张票务
- 该票务有核销记录

**测试步骤：**
```sql
-- 作为用户 A 查询核销记录
SET request.jwt.claims = '{"sub": "user-a-supabase-uid"}';
SELECT * FROM ticket_redemptions WHERE ticket_id = 'user-a-ticket-id';
```

**预期结果：**
- ✅ 返回用户 A 的票务核销记录
- ❌ 不返回其他用户的票务核销记录

---

**测试场景 3.2: 商家员工可以查看自己商家的核销记录**

**前置条件：**
- 商家员工已登录
- 商家员工是目标商家的成员
- 该商家有多个票务的核销记录

**测试步骤：**
```sql
-- 作为商家员工查询核销记录
SET request.jwt.claims = '{"sub": "merchant-staff-supabase-uid"}';
SELECT * FROM ticket_redemptions;
```

**预期结果：**
- ✅ 返回该商家所有票务的核销记录
- ❌ 不返回其他商家的核销记录

---

**测试场景 3.3: 商家员工可以插入核销记录**

**前置条件：**
- 商家员工已登录
- 商家员工是目标商家的成员
- 票务属于该商家的活动

**测试步骤：**
```sql
-- 作为商家员工插入核销记录
SET request.jwt.claims = '{"sub": "merchant-staff-supabase-uid"}';
INSERT INTO ticket_redemptions (
  ticket_id,
  supabase_uid,
  redeemed_by_supabase_uid,
  redeemed_at,
  redeem_source,
  redeem_location
) VALUES (
  'ticket-id',
  'ticket-owner-uid',
  'merchant-staff-supabase-uid',  -- 必须是当前用户
  NOW(),
  'merchant_scan',
  'door'
);
```

**预期结果：**
- ✅ 插入成功（如果 `redeemed_by_supabase_uid = auth.uid()`）
- ❌ 插入失败（如果 `redeemed_by_supabase_uid != auth.uid()`）

---

## 🔍 验证查询

### 查询所有核销记录（按时间排序）
```sql
SELECT 
  tr.id,
  tr.ticket_id,
  t.short_id AS ticket_short_id,
  tr.supabase_uid AS ticket_owner_uid,
  tr.redeemed_by_supabase_uid AS operator_uid,
  tr.redeemed_at,
  tr.redeem_source,
  tr.redeem_location,
  t.holder_email
FROM ticket_redemptions tr
JOIN tickets t ON t.id = tr.ticket_id
ORDER BY tr.redeemed_at DESC
LIMIT 10;
```

### 检查是否有 null 值
```sql
-- 检查 supabase_uid 为 null 的记录
SELECT 
  COUNT(*) AS null_supabase_uid_count
FROM ticket_redemptions
WHERE supabase_uid IS NULL;

-- 检查 redeemed_by_supabase_uid 为 null 的记录
SELECT 
  COUNT(*) AS null_redeemed_by_count
FROM ticket_redemptions
WHERE redeemed_by_supabase_uid IS NULL;

-- 预期：新创建的记录应该都不为 null
```

### 检查旧字段是否还在使用
```sql
-- 检查是否还有使用 user_id 的记录（新创建的应该为 null）
SELECT 
  COUNT(*) AS using_user_id_count
FROM ticket_redemptions
WHERE user_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 day';

-- 预期：新创建的记录 user_id 应该为 null（或已迁移）
```

---

## 📊 性能测试

### 测试核销 API 响应时间
```bash
# 客户核销
time curl -X POST http://localhost:3000/api/tickets/use \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=xxx" \
  -d '{"ticket_id": "xxx"}'

# 商家核销
time curl -X POST http://localhost:3000/api/merchant/redeem \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=xxx" \
  -d '{"qr_payload": "TKT:xxx:xxx:xxx"}'
```

**预期：**
- 响应时间 < 500ms（正常情况）
- 响应时间 < 1000ms（高负载情况）

---

## ✅ 验收标准

修复完成后，以下条件必须全部满足：

1. ✅ 所有新创建的 `ticket_redemptions` 记录都有 `supabase_uid`（不为 null）
2. ✅ 所有新创建的 `ticket_redemptions` 记录都有 `redeemed_by_supabase_uid`（不为 null）
3. ✅ 所有新更新的 `tickets` 记录都有 `redeemed_by_supabase_uid`（不为 null）
4. ✅ RLS 策略正确工作，用户只能查看自己的核销记录
5. ✅ RLS 策略正确工作，商家员工可以查看和插入自己商家的核销记录
6. ✅ 客户核销 API 正常工作
7. ✅ 商家核销 API 正常工作
8. ✅ 没有 linter 错误
9. ✅ 没有运行时错误

