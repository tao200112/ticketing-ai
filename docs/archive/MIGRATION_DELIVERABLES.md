# PartyTix 数据库全面修复 - 交付清单

## 📦 交付内容

### 1. 数据库迁移文件（完整 SQL）✅

#### 主迁移文件（按执行顺序）

1. **`supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql`**
   - 统一用户体系：迁移所有 `user_id` 到 `supabase_uid`
   - 创建 ENUM 类型
   - 数据迁移和索引创建
   - 标记废弃字段

2. **`supabase/migrations/20250115_rebuild_rls_policies.sql`**
   - 重建所有 RLS 策略
   - 修复 `ticket_redemptions` 安全漏洞
   - 统一使用 `supabase_uid`

3. **`supabase/migrations/20250115_refactor_tickets_structure.sql`**
   - 合并 snapshot 字段为 JSONB
   - 标记废弃字段
   - 创建 GIN 索引

4. **`supabase/migrations/20250115_enum_status_fields.sql`**
   - ENUM 化 `orders.status` 和 `tickets.status`
   - 清理脏数据
   - 迁移数据

5. **`supabase/migrations/20250115_refactor_short_id_nanoid.sql`**
   - 创建 nanoid 生成函数
   - 创建重试插入函数示例
   - 添加约束检查

6. **`supabase/migrations/20250115_test_migration.sql`**
   - 完整的测试脚本
   - 验证所有迁移步骤

### 2. 新增字段清单 ✅

#### Orders 表
- ✅ `supabase_uid UUID` - 主要用户标识（新增）

#### Tickets 表
- ✅ `supabase_uid UUID` - 主要用户标识（新增）
- ✅ `event_snapshot JSONB` - 事件快照（新增）
- ✅ `price_snapshot JSONB` - 价格快照（新增）

#### Merchant Members 表
- ✅ `supabase_uid UUID` - 主要用户标识（新增）

#### Merchants 表
- ✅ `owner_supabase_uid UUID` - 商家所有者标识（新增）

#### Ticket Redemptions 表
- ✅ `supabase_uid UUID` - 用户标识（新增）
- ✅ `redeemed_by_supabase_uid UUID` - 核销操作人标识（新增）

### 3. 删除字段清单 ✅

**注意：** 没有直接删除字段，所有字段都标记为 DEPRECATED 并保留。

### 4. 完整 RLS 策略列表（最终版本）✅

#### Orders 表策略
- `orders_select_by_supabase_uid` - SELECT: `auth.uid() = supabase_uid`
- `orders_update_by_supabase_uid` - UPDATE: `auth.uid() = supabase_uid`
- `orders_insert_allow` - INSERT: Service Role only

#### Tickets 表策略
- `tickets_select_by_supabase_uid` - SELECT: `auth.uid() = supabase_uid`
- `tickets_insert_allow` - INSERT: Service Role only
- `tickets_update_by_merchant_staff` - UPDATE: Merchant staff for their events

#### Ticket Redemptions 表策略（关键安全修复）
- `ticket_redemptions_select_own` - SELECT: User's own ticket redemptions
- `ticket_redemptions_select_merchant` - SELECT: Merchant staff can view their merchant's redemptions
- `ticket_redemptions_insert_merchant_staff` - INSERT: Merchant staff only (操作人必须是当前用户)

#### Merchants 表策略
- `merchants_select_owner` - SELECT: Owner or member
- `merchants_update_owner` - UPDATE: Owner only

#### Merchant Members 表策略
- `merchant_members_select_own` - SELECT: Own membership
- `merchant_members_select_merchant` - SELECT: Merchant owner can view all members

#### Events 表策略
- `events_select_public` - SELECT: Published events (public)
- `events_select_merchant` - SELECT: Merchant staff can view their merchant's events

### 5. 代码修改文件列表 + Diff ✅

见 `CODE_UPDATE_GUIDE.md` 文件，包含：
- 需要更新的 8 个文件
- 详细的修改示例
- 通用替换规则

**主要文件：**
1. `app/api/webhook/route.js`
2. `app/api/orders/by-session/route.js`
3. `app/api/tickets/use/route.js`
4. `app/api/merchant/redeem/route.js`
5. `app/api/merchant/create/route.js`
6. `app/api/merchant/login/route.js`
7. `app/merchant/staff/page.js`
8. `app/merchant/scan/page.js`

### 6. Supabase UID 作为唯一身份字段的数据流图 ✅

见 `DATABASE_MIGRATION_COMPLETE.md` 文件中的 "Supabase UID 数据流图" 部分。

**关键流程：**
1. 用户认证 → `auth.users.id = supabase_uid`
2. 创建订单 → `orders.supabase_uid = auth.uid()`
3. 创建票务 → `tickets.supabase_uid = auth.uid()`
4. 查询数据 → RLS 自动过滤 `supabase_uid = auth.uid()`
5. 核销票务 → `ticket_redemptions.supabase_uid` 和 `redeemed_by_supabase_uid`

### 7. 所有 Deprecated 字段的说明 ✅

见 `DATABASE_MIGRATION_COMPLETE.md` 文件中的 "废弃字段清单" 部分。

**主要废弃字段：**
- `orders.user_id` → 使用 `supabase_uid`
- `tickets.user_id` → 使用 `supabase_uid`
- `tickets.status` → 使用 `used` 字段
- `tickets.event_*_snapshot` → 使用 `event_snapshot JSONB`
- `tickets.price_*_snapshot` → 使用 `price_snapshot JSONB`
- `merchant_members.user_id` → 使用 `supabase_uid`
- `merchants.owner_user_id` → 使用 `owner_supabase_uid`
- `ticket_redemptions.user_id` → 使用 `supabase_uid`
- `ticket_redemptions.redeemed_by` → 使用 `redeemed_by_supabase_uid`

### 8. 从旧结构迁移到新结构的指导 ✅

见 `DATABASE_MIGRATION_COMPLETE.md` 文件中的 "迁移指南" 部分。

**迁移步骤：**
1. 运行迁移文件（按顺序）
2. 更新代码（参考 `CODE_UPDATE_GUIDE.md`）
3. 运行测试脚本验证
4. 部署到生产环境

### 9. 一键测试脚本（SQL + API 测试指令）✅

#### SQL 测试脚本
**文件：** `supabase/migrations/20250115_test_migration.sql`

**运行方式：**
```sql
-- 在 Supabase SQL Editor 中运行
\i supabase/migrations/20250115_test_migration.sql
```

**测试内容：**
- ✅ 验证所有 `supabase_uid` 字段存在
- ✅ 验证所有索引存在
- ✅ 验证 ENUM 类型存在
- ✅ 验证 RLS 策略存在
- ✅ 验证 JSONB 字段存在
- ✅ 验证数据迁移状态
- ✅ 验证废弃字段注释
- ✅ 验证 nanoid 函数存在

#### API 测试指令

**测试 1: 购买流程**
```bash
# 1. 登录用户
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# 2. 创建 checkout session
curl -X POST https://your-domain.com/api/checkout_sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "event_id": "<event_id>",
    "price_id": "<price_id>",
    "quantity": 1
  }'

# 3. 完成支付后，验证订单和票务
# 在 Supabase 中检查：
# - orders.supabase_uid 不为 null
# - tickets.supabase_uid 不为 null
```

**测试 2: 查询我的票务**
```bash
# 应该只返回当前用户的票务（RLS 自动过滤）
curl -X GET https://your-domain.com/api/user/tickets \
  -H "Authorization: Bearer <token>"
```

**测试 3: 核销流程**
```bash
# 商家员工核销票务
curl -X POST https://your-domain.com/api/merchant/redeem \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "ticket_id": "<ticket_id>"
  }'

# 验证：
# - ticket_redemptions.supabase_uid 不为 null
# - ticket_redemptions.redeemed_by_supabase_uid 不为 null
```

## 📚 文档文件

1. **`DATABASE_MIGRATION_COMPLETE.md`** - 完整修复报告
2. **`CODE_UPDATE_GUIDE.md`** - 代码更新指南
3. **`MIGRATION_DELIVERABLES.md`** - 本文件（交付清单）

## 🚀 执行顺序

1. **运行数据库迁移**（按顺序）
   ```sql
   \i supabase/migrations/20250115_unify_user_system_to_supabase_uid.sql
   \i supabase/migrations/20250115_rebuild_rls_policies.sql
   \i supabase/migrations/20250115_refactor_tickets_structure.sql
   \i supabase/migrations/20250115_enum_status_fields.sql
   \i supabase/migrations/20250115_refactor_short_id_nanoid.sql
   ```

2. **运行测试脚本**
   ```sql
   \i supabase/migrations/20250115_test_migration.sql
   ```

3. **更新代码**
   - 参考 `CODE_UPDATE_GUIDE.md`
   - 更新所有使用 `user_id` 的地方

4. **测试 API**
   - 运行上面的 API 测试指令
   - 验证购买流程
   - 验证核销流程

5. **部署到生产**
   - 确保所有测试通过
   - 监控日志
   - 验证数据一致性

## ⚠️ 重要提醒

1. **备份数据库** - 在运行迁移前备份
2. **测试环境先运行** - 在测试环境验证后再部署生产
3. **逐步迁移** - 可以分步骤运行迁移文件
4. **监控日志** - 迁移过程中监控错误日志
5. **数据验证** - 迁移后验证数据完整性

## 📞 支持

如有问题，请检查：
1. 迁移日志中的错误信息
2. 测试脚本的输出
3. Supabase Dashboard 中的表结构
4. RLS 策略是否正确应用

