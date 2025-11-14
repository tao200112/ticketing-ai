# Supabase UID 修复验证步骤

## ✅ 当前状态

根据你的查询结果：
- ✅ **所有票务都有 supabase_uid**（tickets_without_uid = 0）
- ✅ **最近创建的票都有 supabase_uid**（recent_tickets_without_uid = 0）
- ⚠️ **还有 3 个订单的 supabase_uid 为 null**（orders_without_uid = 3）

## 🔧 修复剩余订单

### 步骤 1: 修复订单的 supabase_uid

在 Supabase SQL Editor 中执行：
```sql
\i supabase/migrations/fix_null_supabase_uid_orders.sql
```

这将：
1. 通过 `customer_email` 匹配 `auth.users` 更新订单的 `supabase_uid`
2. 如果匹配不到，则通过关联的票务更新

### 步骤 2: 验证修复

```sql
-- 查看修复后的订单
SELECT 
  id,
  stripe_session_id,
  customer_email,
  supabase_uid,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 确认所有订单都有 supabase_uid
SELECT 
  COUNT(*) as total_orders,
  COUNT(supabase_uid) as orders_with_uid,
  COUNT(*) - COUNT(supabase_uid) as orders_without_uid
FROM orders;
```

## 🧪 功能测试

### 测试 1: My Tickets 页面

1. **使用账号 `taoliu001711@gmail.com` 登录**
2. **打开 Account 页面** (`/account`)
3. **查看 My Tickets 部分**，应该显示：
   - 至少 6 张票（根据你的查询结果）
   - 所有票都应该有 QR code
   - 票务信息完整

4. **查看浏览器控制台**，应该看到：
   ```
   🔍 Account Page - Auth UID: f445f29f-4c05-41e9-aafd-cad4a6aca736
   🎫 Account Page - Tickets returned: 6 [...]
   ```

### 测试 2: Order History

1. **在 Account 页面查看 Order History**
2. **应该显示所有订单**
3. **每个订单应该关联到正确的票务**

### 测试 3: 新购买测试

1. **使用任何账号登录**
2. **购买一张新票**
3. **验证：**
   - 成功页显示 "1 ticket created"
   - My Tickets 显示新票
   - 数据库中新票的 `supabase_uid` 不为 null

## 📊 验证检查清单

- [x] 所有票务都有 supabase_uid（tickets_without_uid = 0）
- [x] 最近创建的票都有 supabase_uid（recent_tickets_without_uid = 0）
- [ ] 所有订单都有 supabase_uid（需要运行修复脚本）
- [ ] My Tickets 页面正常显示票务
- [ ] Order History 正常显示订单
- [ ] QR code 可以正常生成
- [ ] 新购买的票正常显示

## 🔍 如果 My Tickets 仍然为空

如果修复后 My Tickets 仍然为空，请检查：

1. **RLS Policy 是否正确**
   ```sql
   -- 检查 RLS policies
   SELECT tablename, policyname, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public' 
     AND tablename IN ('orders', 'tickets');
   ```

2. **当前用户的 Supabase UID**
   - 在浏览器控制台查看：`🔍 Account Page - Auth UID: ...`
   - 确认这个 UID 与数据库中的 `supabase_uid` 匹配

3. **查询是否被 RLS 阻止**
   - 查看浏览器网络请求
   - 检查是否有 403 错误

## 📝 下一步

1. **运行订单修复脚本**（修复剩余的 3 个订单）
2. **测试 My Tickets 页面**（确认票务正常显示）
3. **测试新购买流程**（确认新票正常创建）

