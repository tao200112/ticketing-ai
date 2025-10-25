# 🔍 可观测性运维手册

> PR-6: 健康检查与统一日志观测  
> 更新时间: 2024年10月

## 📋 概述

本文档提供完整的可观测性运维指南，包括健康检查、日志检索、问题定位和告警设置。

---

## 🏥 健康检查端点

### 1. 基础健康检查

**端点**: `GET /api/health`

**用途**: 检查应用存活状态和版本信息

**响应示例**:
```json
{
  "ok": true,
  "code": "HEALTHY",
  "message": "Application is healthy",
  "ts": "2024-10-25T10:00:00.000Z",
  "metrics": {
    "responseTimeMs": 15,
    "uptime": 3600,
    "memoryUsage": { "rss": 50000000, "heapTotal": 20000000 },
    "nodeVersion": "v18.17.0",
    "platform": "linux"
  },
  "version": {
    "app": "1.0.0",
    "build": "2024-10-25T09:00:00.000Z",
    "git": "abc12345"
  }
}
```

### 2. 数据库健康检查

**端点**: `GET /api/health/db`

**用途**: 检查数据库连通性和 RLS 策略

**响应示例**:
```json
{
  "ok": true,
  "code": "DB_HEALTHY",
  "message": "Database is healthy and RLS policies are working",
  "ts": "2024-10-25T10:00:00.000Z",
  "metrics": {
    "responseTimeMs": 45,
    "eventsCount": 1,
    "publicEventsCount": 1
  }
}
```

### 3. 事件健康检查

**端点**: `GET /api/health/events/[slug]`

**用途**: 验证特定事件的可访问性

**响应示例**:
```json
{
  "ok": true,
  "code": "EVENT_ACCESSIBLE",
  "message": "Event is accessible and data is complete",
  "ts": "2024-10-25T10:00:00.000Z",
  "metrics": {
    "responseTimeMs": 32,
    "slug": "ridiculous-chicken",
    "eventId": "event_123",
    "hasPrices": true,
    "priceCount": 2
  }
}
```

### 4. 用户健康检查

**端点**: `GET /api/health/user`

**用途**: 检查用户认证状态和权限

**响应示例**:
```json
{
  "ok": true,
  "code": "USER_HEALTHY",
  "message": "User health check completed",
  "ts": "2024-10-25T10:00:00.000Z",
  "metrics": {
    "responseTimeMs": 28,
    "isAuthenticated": true,
    "hasPermissions": true
  },
  "user": {
    "isAuthenticated": true,
    "hasUser": true,
    "userId": "user_123...",
    "emailVerified": true,
    "lastSignIn": "2024-10-25T09:30:00.000Z",
    "createdAt": "2024-10-20T10:00:00.000Z"
  },
  "permissions": {
    "canReadOwnData": true,
    "dataAccessError": null
  }
}
```

---

## 📊 结构化日志格式

### 1. 日志字段字典

| 字段 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `ts` | string | ISO 时间戳 | `"2024-10-25T10:00:00.000Z"` |
| `level` | string | 日志级别 | `"info"`, `"warn"`, `"error"` |
| `fn` | string | 函数/模块名 | `"stripe/webhook"`, `"orders/by-session"` |
| `requestId` | string | 请求唯一标识 | `"req_1698234567890_abc123"` |
| `duration_ms` | number | 执行耗时(毫秒) | `150` |
| `sessionId` | string | Stripe Session ID(脱敏) | `"cs_1234..."` |
| `eventId` | string | 事件ID | `"event_123"` |
| `userId` | string | 用户ID(脱敏) | `"user_123..."` |
| `supabaseError` | object | Supabase错误信息 | `{"code": "PGRST301", "message": "..."}` |
| `http` | object | HTTP信息 | `{"status": 200, "method": "GET"}` |
| `needs_attention` | boolean | 是否需要人工干预 | `true` |
| `message` | string | 日志消息 | `"Order created successfully"` |

### 2. 日志示例

#### 成功日志
```json
{
  "ts": "2024-10-25T10:00:00.000Z",
  "level": "info",
  "fn": "orders/by-session",
  "requestId": "req_1698234567890_abc123",
  "duration_ms": 150,
  "sessionId": "cs_1234...",
  "orderId": "order_456",
  "ticketCount": 2,
  "http": {"status": 200, "method": "GET"},
  "message": "Retrieved order successfully"
}
```

#### 错误日志
```json
{
  "ts": "2024-10-25T10:00:00.000Z",
  "level": "error",
  "fn": "stripe/webhook",
  "requestId": "req_1698234567890_def456",
  "duration_ms": 2000,
  "sessionId": "cs_5678...",
  "needs_attention": true,
  "error": {
    "name": "DatabaseError",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at ..."
  },
  "message": "Error processing order"
}
```

---

## 🔍 常用检索查询

### 1. Vercel 日志检索

#### 按函数检索
```bash
# 查看所有 Webhook 相关日志
vercel logs --filter="fn=stripe/webhook"

# 查看订单查询日志
vercel logs --filter="fn=orders/by-session"
```

#### 按请求ID检索
```bash
# 查看特定请求的完整链路
vercel logs --filter="requestId=req_1698234567890_abc123"
```

#### 按错误级别检索
```bash
# 查看所有错误日志
vercel logs --filter="level=error"

# 查看需要人工干预的日志
vercel logs --filter="needs_attention=true"
```

### 2. Supabase 日志检索

#### 在 Supabase Dashboard 中查询
```sql
-- 查看数据库错误
SELECT * FROM logs 
WHERE level = 'error' 
AND supabaseError IS NOT NULL
ORDER BY ts DESC;

-- 查看性能问题
SELECT * FROM logs 
WHERE duration_ms > 2000
ORDER BY duration_ms DESC;
```

### 3. 组合查询

#### 问题定位查询
```bash
# 查看特定会话的所有日志
vercel logs --filter="sessionId=cs_1234" --filter="level=error"

# 查看特定时间段的错误
vercel logs --filter="ts>=2024-10-25T09:00:00" --filter="level=error"

# 查看特定用户的请求
vercel logs --filter="userId=user_123" --filter="fn=orders/by-session"
```

---

## 🚨 典型问题定位

### 1. Webhook 未出票

**症状**: 用户支付成功但未收到票据

**排查步骤**:
1. 查看 Webhook 日志：
   ```bash
   vercel logs --filter="fn=stripe/webhook" --filter="sessionId=cs_xxx"
   ```

2. 检查幂等性：
   ```bash
   vercel logs --filter="fn=stripe/webhook" --filter="message=*skipping*"
   ```

3. 查看错误日志：
   ```bash
   vercel logs --filter="fn=stripe/webhook" --filter="level=error"
   ```

**常见原因**:
- `supabaseError.code="PGRST301"` - RLS 策略拒绝
- `needs_attention=true` - 需要人工干预
- `duration_ms > 5000` - 处理超时

### 2. 成功页超时

**症状**: 成功页显示"Taking longer than usual"

**排查步骤**:
1. 查看 by-session API 日志：
   ```bash
   vercel logs --filter="fn=orders/by-session" --filter="level=error"
   ```

2. 检查响应时间：
   ```bash
   vercel logs --filter="fn=orders/by-session" --filter="duration_ms>1500"
   ```

3. 查看 HTTP 状态：
   ```bash
   vercel logs --filter="fn=orders/by-session" --filter="http.status=500"
   ```

**常见原因**:
- `http.status=500` - 服务器内部错误
- `duration_ms > 30000` - 请求超时
- `supabaseError.code="PGRST116"` - 订单不存在

### 3. RLS 拒绝

**症状**: 数据库查询被拒绝

**排查步骤**:
1. 查看 RLS 错误：
   ```bash
   vercel logs --filter="supabaseError.code=PGRST301"
   ```

2. 检查用户权限：
   ```bash
   vercel logs --filter="fn=health/user" --filter="level=error"
   ```

3. 查看数据库健康：
   ```bash
   curl https://your-app.vercel.app/api/health/db
   ```

**常见原因**:
- `supabaseError.code="PGRST301"` - RLS 策略拒绝访问
- `supabaseError.code="PGRST116"` - 记录不存在
- 用户未登录或权限不足

---

## 📈 性能阈值与告警

### 1. 性能阈值

| 指标 | 正常值 | 警告值 | 危险值 |
|------|--------|--------|--------|
| 成功页 API P95 | < 1500ms | 1500-3000ms | > 3000ms |
| Webhook 完成 P95 | < 2000ms | 2000-5000ms | > 5000ms |
| 数据库查询 P95 | < 500ms | 500-1000ms | > 1000ms |
| 错误率 | < 1% | 1-5% | > 5% |

### 2. 告警建议

#### 基于日志计数的告警
```bash
# 检查需要人工干预的日志
vercel logs --filter="needs_attention=true" --count

# 检查错误率
vercel logs --filter="level=error" --count
vercel logs --filter="level=info" --count
```

#### 基于响应时间的告警
```bash
# 检查慢查询
vercel logs --filter="duration_ms>2000" --count

# 检查超时请求
vercel logs --filter="duration_ms>30000" --count
```

#### 基于 HTTP 状态的告警
```bash
# 检查 5xx 错误
vercel logs --filter="http.status>=500" --count

# 检查 4xx 错误
vercel logs --filter="http.status>=400" --filter="http.status<500" --count
```

### 3. 自动化监控脚本

```bash
#!/bin/bash
# 监控脚本示例

# 检查错误率
ERROR_COUNT=$(vercel logs --filter="level=error" --count --since=1h)
TOTAL_COUNT=$(vercel logs --count --since=1h)
ERROR_RATE=$((ERROR_COUNT * 100 / TOTAL_COUNT))

if [ $ERROR_RATE -gt 5 ]; then
  echo "ALERT: Error rate is ${ERROR_RATE}% (threshold: 5%)"
  # 发送告警通知
fi

# 检查慢查询
SLOW_QUERIES=$(vercel logs --filter="duration_ms>2000" --count --since=1h)
if [ $SLOW_QUERIES -gt 10 ]; then
  echo "ALERT: ${SLOW_QUERIES} slow queries detected"
  # 发送告警通知
fi
```

---

## 🔒 敏感信息合规

### 1. 禁止在日志中出现的字段

| 字段类型 | 示例 | 处理方式 |
|----------|------|----------|
| 密码 | `password`, `pwd` | 自动替换为 `[REDACTED]` |
| 令牌 | `token`, `auth`, `session` | 自动替换为 `[REDACTED]` |
| 密钥 | `key`, `secret`, `api_key` | 自动替换为 `[REDACTED]` |
| 个人信息 | `email`, `phone`, `ssn` | 自动替换为 `[REDACTED]` |
| 支付信息 | `credit_card`, `card_number` | 自动替换为 `[REDACTED]` |

### 2. 日志脱敏示例

**原始数据**:
```javascript
{
  email: "user@example.com",
  password: "secret123",
  stripeSecret: "sk_test_123",
  sessionId: "cs_1234567890"
}
```

**脱敏后**:
```json
{
  "email": "[REDACTED]",
  "password": "[REDACTED]",
  "stripeSecret": "[REDACTED]",
  "sessionId": "cs_1234..."
}
```

### 3. 合规检查

运行日志合规检查：
```bash
npm run lint:logs
```

检查项目：
- ✅ 生产路径中无 `console.log` 使用
- ✅ 客户端代码未导入服务端日志工具
- ✅ 日志参数中无 PII 关键词
- ✅ 敏感字段已自动脱敏

---

## 🛠️ 故障排除

### 1. 健康检查失败

**症状**: `/api/health` 返回 500 错误

**排查步骤**:
1. 检查应用状态：
   ```bash
   curl -v https://your-app.vercel.app/api/health
   ```

2. 查看应用日志：
   ```bash
   vercel logs --filter="fn=health" --filter="level=error"
   ```

3. 检查环境变量：
   ```bash
   vercel env ls
   ```

### 2. 数据库连接失败

**症状**: `/api/health/db` 返回 503 错误

**排查步骤**:
1. 检查数据库健康：
   ```bash
   curl https://your-app.vercel.app/api/health/db
   ```

2. 查看数据库日志：
   ```bash
   vercel logs --filter="fn=health/db" --filter="level=error"
   ```

3. 检查 Supabase 状态：
   - 访问 Supabase Dashboard
   - 检查数据库连接
   - 验证 RLS 策略

### 3. 日志格式错误

**症状**: 日志不是有效的 JSON 格式

**排查步骤**:
1. 运行日志检查：
   ```bash
   npm run lint:logs
   ```

2. 查看具体错误：
   ```bash
   vercel logs --filter="level=error" --filter="message=*JSON*"
   ```

3. 检查日志工具使用：
   ```bash
   grep -r "console\." app/ lib/
   ```

---

## 📚 相关文档

- [健康检查端点](../app/api/health/)
- [统一日志工具](../lib/logger.js)
- [请求ID工具](../lib/request-id.js)
- [日志检查脚本](../scripts/lint-logs.mjs)
- [QR流程文档](./QR_FLOW.md)

---

## 🔗 相关 PR

- **PR-5**: 订单→出票→二维码完整流程 ✅
- **PR-6**: 健康检查与统一日志观测 ✅
