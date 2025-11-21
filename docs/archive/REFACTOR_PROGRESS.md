# 全面重构进度报告

## 重构目标

1. **PRIMARY**: 完全移除 user_id，统一使用 AuthContext + auth_token ✅ 进行中
2. **PRIMARY**: 移除 supabase_uid 逻辑，替换为 AuthContext identity ✅ 进行中
3. **SECONDARY**: 修复票务和组合票问题 ⏳ 待处理
4. **THIRD**: 全局清理旧代码 ⏳ 待处理
5. **FOURTH**: 修复订单和会话一致性 ✅ 进行中
6. **FIFTH**: 确保客户端认证一致性 ⏳ 待处理

## 已完成的文件修改

### 1. lib/auth-identity.js (新建)
- **问题**: 缺少统一的身份获取函数
- **修复**: 创建统一的身份系统，使用 AuthContext 作为唯一来源
- **变更**: 
  - 新增 `getServerAuthIdentity()` 函数
  - 新增 `isValidAuthIdentity()` 验证函数

### 2. app/api/checkout_sessions/route.js
- **问题**: 使用 `user_id` 和 `supabaseUid` 变量名，有回退逻辑
- **修复**: 
  - 移除所有 `user_id` 引用
  - 统一使用 `authIdentity` 和 `authUserId` 变量名
  - 移除从 body 获取 `userId` 的回退逻辑
  - Stripe metadata 使用 `auth_user_id` 字段名
- **变更**:
  ```javascript
  // 之前
  const { userId } = body
  let supabaseUid = authUser?.id || null
  if (!supabaseUid && userId) { ... }
  
  // 之后
  const authIdentity = await getServerAuthIdentity()
  const authUserId = authIdentity.id
  // 不再有回退逻辑
  ```

### 3. app/api/webhook/route.js
- **问题**: 使用 `supabaseUid` 变量名，从 metadata 读取 `supabase_uid`
- **修复**: 
  - 统一使用 `authUserId` 变量名
  - 支持新字段名 `auth_user_id` 和旧字段名 `supabase_uid`（向后兼容）
  - 所有数据库插入使用 `authUserId`
- **变更**:
  ```javascript
  // 之前
  let supabaseUid = session.metadata?.supabase_uid || null
  supabase_uid: supabaseUid
  
  // 之后
  let authUserId = session.metadata?.auth_user_id || session.metadata?.supabase_uid || null
  supabase_uid: authUserId // Database field name
  ```

### 4. app/api/orders/by-session/route.js
- **问题**: 使用 `userId`、`supabaseUid` 变量名，函数参数不一致
- **修复**: 
  - 统一使用 `authIdentity` 和 `authUserId`
  - 更新 `ownsOrder()` 和 `ensureOrderOwnedByUser()` 函数参数
  - 更新 `createOrderFromStripe()` 函数参数
  - 支持新字段名 `auth_user_id` 和旧字段名 `supabase_uid`（向后兼容）
- **变更**:
  ```javascript
  // 之前
  function ownsOrder(order, supabaseUid, userEmail)
  async function ensureOrderOwnedByUser(order, supabaseUid)
  async function createOrderFromStripe(sessionId, supabaseUid, userEmail)
  
  // 之后
  function ownsOrder(order, authUserId, userEmail)
  async function ensureOrderOwnedByUser(order, authUserId)
  async function createOrderFromStripe(sessionId, authUserId, userEmail)
  ```

### 5. app/api/tickets/use/route.js
- **问题**: 使用 `user_id` 字段查询，使用 `supabaseUid` 变量名，有回退逻辑
- **修复**: 
  - 移除所有 `user_id` 字段查询
  - 统一使用 `authIdentity` 和 `authUserId`
  - 移除从 body 获取 `userId` 的回退逻辑
  - 更新所有权验证逻辑
- **变更**:
  ```javascript
  // 之前
  .select('id, user_id, supabase_uid, ...')
  const { userId: bodyUserId } = body
  const userId = supabaseUid || bodyUserId
  
  // 之后
  .select('id, supabase_uid, ...')
  const authIdentity = await getServerAuthIdentity()
  const authUserId = authIdentity.id
  ```

## 待修改文件

### API 路由文件

1. `app/api/tickets/verify/route.js` ⏳
   - 检查并移除 `user_id` 引用
   - 统一使用 `authIdentity`

2. `app/api/merchant/redeem/route.js` ⏳
   - 移除 `user_id` 引用
   - 统一使用 `authIdentity`

3. `app/api/merchant/login/route.js` ⏳
   - 检查并修复身份获取逻辑

4. `app/api/merchant/create/route.js` ⏳
   - 检查并修复身份获取逻辑

5. `app/api/users/sync/route.js` ⏳
   - 检查并修复身份获取逻辑

### 前端文件

1. `app/account/page.js` ⏳
   - 移除所有 `user_id` 引用
   - 统一使用 AuthContext

2. `app/events/[id]/page.js` ⏳
   - 检查并修复身份获取逻辑

3. `app/events/[id]/EventDetailClient.tsx` ⏳
   - 检查并修复身份获取逻辑

### 其他文件

1. `backend/server.js` ⏳
   - 移除 JWT 中的 `userId`，使用 Supabase Auth UID

## 修复策略总结

### 变量命名统一
- **旧**: `userId`, `user_id`, `supabaseUid`, `supabase_uid` (变量名)
- **新**: `authIdentity` (对象), `authUserId` (变量名)
- **数据库**: `supabase_uid` (字段名，存储 Supabase Auth UID)

### 身份获取统一
- **客户端**: 从 `useAuth()` hook 获取 `user.id`
- **服务器**: 从 `getServerAuthIdentity()` 获取 `{ id, email }`
- **数据库**: 存储到 `supabase_uid` 字段

### Metadata 字段统一
- **新字段名**: `auth_user_id` (Stripe metadata)
- **旧字段名**: `supabase_uid` (向后兼容)
- **数据库字段**: `supabase_uid` (存储 Supabase Auth UID)

## 测试检查清单

- [ ] 所有 API 不再使用 `user_id`
- [ ] 所有 API 统一使用 `authIdentity` 和 `authUserId`
- [ ] Stripe metadata 使用 `auth_user_id` 字段
- [ ] 数据库字段 `supabase_uid` 正确存储 Supabase Auth UID
- [ ] 票务创建使用正确的 snapshot 字段
- [ ] 组合票正确生成 2+ 张票
- [ ] 订单绑定到正确的身份
- [ ] 前端统一使用 AuthContext
