# 代码更新指南：迁移到 supabase_uid

## 📋 概述

本指南帮助你将代码从使用 `user_id` 迁移到使用 `supabase_uid`。

## 🔍 需要更新的文件

### 1. `app/api/webhook/route.js`

**需要修改的地方：**
- 移除 `user_id` 的写入
- 确保只使用 `supabase_uid`

**修改示例：**
```javascript
// ❌ 旧代码（第 170 行）
user_id: session.metadata?.user_id || null,

// ✅ 新代码
// 移除 user_id，只使用 supabase_uid
```

```javascript
// ❌ 旧代码（第 378 行）
user_id: session.metadata?.user_id || null,

// ✅ 新代码
// 移除 user_id，只使用 supabase_uid
```

### 2. `app/api/orders/by-session/route.js`

**需要修改的地方：**
- 移除所有 `user_id` 的查询和写入
- 统一使用 `supabase_uid`

**修改示例：**
```javascript
// ❌ 旧代码（第 22 行）
if (order.user_id && order.user_id === userId) return true

// ✅ 新代码
if (order.supabase_uid && order.supabase_uid === userId) return true
```

```javascript
// ❌ 旧代码（第 28 行）
if (metadata?.user_id && metadata.user_id === userId) {

// ✅ 新代码
if (metadata?.supabase_uid && metadata.supabase_uid === userId) {
```

```javascript
// ❌ 旧代码（第 44 行）
if (order.user_id === userId) return order

// ✅ 新代码
if (order.supabase_uid === userId) return order
```

```javascript
// ❌ 旧代码（第 51 行）
.update({ user_id: userId })

// ✅ 新代码
.update({ supabase_uid: userId })
```

```javascript
// ❌ 旧代码（多处）
user_id: userId,

// ✅ 新代码
supabase_uid: userId,  // 或 supabaseUid
```

### 3. `app/api/tickets/use/route.js`

**需要修改的地方：**
- 更新 `ticket_redemptions` 插入
- 移除 `user_id` 的查询

**修改示例：**
```javascript
// ❌ 旧代码（第 96 行）
if (orderData?.user_id) {
  orderUserId = orderData.user_id

// ✅ 新代码
if (orderData?.supabase_uid) {
  orderUserId = orderData.supabase_uid
```

```javascript
// ❌ 旧代码（第 115 行）
const ticketUserId = ticket.user_id

// ✅ 新代码
const ticketUserId = ticket.supabase_uid
```

```javascript
// ❌ 旧代码（第 192 行）
user_id: userId,

// ✅ 新代码
supabase_uid: userId,
```

### 4. `app/api/merchant/redeem/route.js`

**需要修改的地方：**
- 更新 `redeemed_by` 为 `redeemed_by_supabase_uid`
- 更新 `merchants.owner_user_id` 查询

**修改示例：**
```javascript
// ❌ 旧代码（第 142 行）
.select('id, owner_user_id')

// ✅ 新代码
.select('id, owner_supabase_uid')
```

```javascript
// ❌ 旧代码（第 162 行）
const isOwner = merchant.owner_user_id === userId

// ✅ 新代码
const isOwner = merchant.owner_supabase_uid === userId
```

```javascript
// ❌ 旧代码（第 199 行）
redeemed_by: userId,

// ✅ 新代码
redeemed_by_supabase_uid: userId,
```

### 5. `app/api/merchant/create/route.js`

**需要修改的地方：**
- 更新 `owner_user_id` 为 `owner_supabase_uid`

**修改示例：**
```javascript
// ❌ 旧代码（第 245 行）
.eq('owner_user_id', finalUserId)

// ✅ 新代码
.eq('owner_supabase_uid', finalUserId)
```

```javascript
// ❌ 旧代码（第 276 行）
merchantData.owner_user_id = finalUserId

// ✅ 新代码
merchantData.owner_supabase_uid = finalUserId
```

### 6. `app/api/merchant/login/route.js`

**需要修改的地方：**
- 更新 `owner_user_id` 查询

**修改示例：**
```javascript
// ❌ 旧代码（第 128 行）
.eq('owner_user_id', user.id)

// ✅ 新代码
.eq('owner_supabase_uid', user.id)
```

### 7. `app/merchant/staff/page.js`

**需要修改的地方：**
- 更新 `merchant_members` 查询

**修改示例：**
```javascript
// ❌ 旧代码（第 365 行）
user_id: userId

// ✅ 新代码
supabase_uid: userId
```

### 8. `app/merchant/scan/page.js`

**需要修改的地方：**
- 更新所有 `user_id` 引用

**修改示例：**
```javascript
// ❌ 旧代码（第 447 行）
user_id: userId

// ✅ 新代码
supabase_uid: userId
```

## 🔄 通用替换规则

### 查询替换
```javascript
// ❌ 旧
.eq('user_id', userId)
.eq('owner_user_id', userId)

// ✅ 新
.eq('supabase_uid', supabaseUid)
.eq('owner_supabase_uid', supabaseUid)
```

### 插入替换
```javascript
// ❌ 旧
.insert({
  user_id: userId,
  owner_user_id: userId,
  redeemed_by: userId
})

// ✅ 新
.insert({
  supabase_uid: supabaseUid,
  owner_supabase_uid: supabaseUid,
  redeemed_by_supabase_uid: supabaseUid
})
```

### 更新替换
```javascript
// ❌ 旧
.update({ user_id: userId })

// ✅ 新
.update({ supabase_uid: supabaseUid })
```

## 📝 注意事项

1. **变量名一致性**
   - 使用 `supabaseUid` 而不是 `userId`（如果可能）
   - 确保从 `auth.uid()` 或 `getServerUser()` 获取

2. **向后兼容**
   - 不要删除 `user_id` 字段的读取（如果存在）
   - 但优先使用 `supabase_uid`

3. **RLS 策略**
   - 所有 RLS 现在基于 `supabase_uid`
   - 确保用户已登录

4. **测试**
   - 更新代码后运行测试脚本
   - 验证购买流程
   - 验证核销流程

