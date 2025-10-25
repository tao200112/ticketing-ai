# 🚨 数据库结构修复指南

## 问题诊断

**当前问题**: 成功页显示 "Failed to load tickets" 和 "Failed to execute 'json' on 'Response': Unexpected end of JSON input"

**根本原因**: 数据库表缺少必要的字段，导致 API 查询失败

## 📊 问题详情

### 1. 缺失的字段

#### orders 表缺失字段：
- `stripe_session_id` - Stripe 会话 ID
- `customer_email` - 客户邮箱
- `tier` - 票务等级
- `currency` - 货币类型

#### tickets 表缺失字段：
- `short_id` - 短票据 ID
- `holder_email` - 持票人邮箱
- `tier` - 票务等级
- `price_cents` - 价格（分）
- `qr_payload` - 二维码载荷
- `issued_at` - 签发时间

#### events 表缺失字段：
- `slug` - 事件别名
- `poster_url` - 海报 URL
- `venue_name` - 场地名称
- `start_at` / `end_at` - 开始/结束时间

### 2. 错误表现

```
❌ orders 表查询失败: column orders.stripe_session_id does not exist
❌ tickets 表查询失败: column tickets.price_cents does not exist
```

## ✅ 解决方案

### 方案 1: 数据库迁移（推荐）

1. **在 Supabase SQL Editor 中运行 `fix-database-schema.sql`**
   - 自动添加所有缺失字段
   - 创建必要的索引
   - 更新 RLS 策略

2. **验证迁移结果**
   ```sql
   -- 检查 orders 表结构
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders' 
   AND table_schema = 'public';
   ```

### 方案 2: 手动添加字段

```sql
-- 添加 orders 表字段
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN tier TEXT DEFAULT 'general';
ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'usd';

-- 添加 tickets 表字段
ALTER TABLE tickets ADD COLUMN short_id TEXT UNIQUE;
ALTER TABLE tickets ADD COLUMN holder_email TEXT;
ALTER TABLE tickets ADD COLUMN tier TEXT DEFAULT 'general';
ALTER TABLE tickets ADD COLUMN price_cents INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN qr_payload TEXT;
ALTER TABLE tickets ADD COLUMN issued_at TIMESTAMPTZ DEFAULT NOW();

-- 添加 events 表字段
ALTER TABLE events ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE events ADD COLUMN poster_url TEXT;
ALTER TABLE events ADD COLUMN venue_name TEXT;
ALTER TABLE events ADD COLUMN start_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN end_at TIMESTAMPTZ;
```

### 方案 3: 临时修复（已实施）

- ✅ 修改 `app/api/orders/by-session/route.js` 返回模拟数据
- ✅ 避免数据库字段缺失错误
- ✅ 成功页可以正常显示

## 🔧 当前状态

### 已完成的临时修复

1. **API 路由修复**
   - `app/api/orders/by-session/route.js` 现在返回模拟数据
   - 避免数据库字段缺失错误
   - 成功页可以正常显示二维码

2. **模拟数据结构**
   ```json
   {
     "ok": true,
     "order": {
       "id": "order_123",
       "sessionId": "cs_test_xxx",
       "email": "test@example.com",
       "eventId": "event_123",
       "tier": "general",
       "amount": 2500,
       "currency": "usd",
       "status": "completed",
       "ticketCount": 1
     },
     "tickets": [
       {
         "id": "ABC12345",
         "eventId": "event_123",
         "tier": "general",
         "holderEmail": "test@example.com",
         "status": "unused",
         "qrPayload": "{\"code\":\"ABC12345\",...}"
       }
     ]
   }
   ```

## 📋 下一步操作

### 立即操作（推荐）

1. **运行数据库迁移**
   ```bash
   # 在 Supabase SQL Editor 中执行
   # 复制 fix-database-schema.sql 内容并运行
   ```

2. **恢复真实数据查询**
   - 将 `app/api/orders/by-session/route.js` 恢复为使用数据访问层
   - 移除模拟数据逻辑

3. **测试验证**
   - 访问成功页，确认显示真实数据
   - 检查二维码是否正常生成

### 长期规划

1. **完善数据库结构**
   - 添加所有必要字段
   - 创建适当的索引
   - 设置正确的 RLS 策略

2. **数据迁移**
   - 将现有数据迁移到新结构
   - 确保数据一致性

3. **测试覆盖**
   - 添加数据库结构测试
   - 确保 API 端点正常工作

## 🚨 注意事项

1. **临时修复限制**
   - 当前使用模拟数据，不是真实订单
   - 需要尽快运行数据库迁移

2. **数据一致性**
   - 迁移后需要验证数据完整性
   - 确保所有相关表结构一致

3. **生产环境**
   - 在生产环境部署前必须完成数据库迁移
   - 确保所有字段和约束正确设置

## 📞 支持

如果遇到问题，请检查：
1. Supabase 连接是否正常
2. 环境变量是否正确设置
3. 数据库迁移是否成功执行
4. API 端点是否返回正确数据
