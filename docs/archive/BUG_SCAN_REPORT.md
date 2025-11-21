# 🐛 项目 Bug 扫描报告

**扫描时间**: 2025-01-29  
**扫描范围**: 完整代码库  
**扫描方法**: 静态代码分析 + 架构审计

---

## 📋 执行摘要

本次扫描发现了 **8 个主要问题**，其中：
- 🔴 **严重问题**: 2 个
- 🟡 **中等问题**: 4 个
- 🟢 **轻微问题**: 2 个

---

## 🔴 严重问题

### 1. Webhook 密钥硬编码（安全风险）

**位置**: `app/api/webhook/route.js:23`

**问题**:
```javascript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_JVzc3itvZMUN7l3Ig3A4MatQfB0XCqlr'
```

**风险**:
- 硬编码的密钥暴露在代码中
- 如果代码被公开，攻击者可以伪造 webhook 请求
- 违反了安全最佳实践

**建议修复**:
```javascript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!webhookSecret) {
  console.error('❌ STRIPE_WEBHOOK_SECRET 未配置')
  return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
}
```

**严重程度**: 🔴 高

---

### 2. Prisma 未使用但仍在导入（代码冗余）

**位置**: `lib/ticket-service.js:1`

**问题**:
- 导入了 `prisma` 但从未实际使用
- `hasSupabase()` 始终返回 `true`，导致 Prisma 分支永远不会执行
- 增加了不必要的依赖和代码复杂度

**证据**:
```javascript
// lib/ticket-service.js:36-60
if (hasSupabase() && supabase) {
  // 总是走这个分支
} else {
  // 永远不会执行
  existingOrder = await prisma.order.findUnique({...})
}
```

**影响**:
- 增加了 bundle 大小
- 代码维护成本增加
- 可能造成混淆

**建议修复**:
- 移除未使用的 Prisma 导入
- 或者添加注释说明为什么保留 Prisma 作为回退方案

**严重程度**: 🔴 中（代码质量）

---

## 🟡 中等问题

### 3. supabaseAdmin 空值检查不一致

**位置**: 多个文件使用 `supabaseAdmin`

**问题**:
- `lib/db/index.ts` 中有适当的空值检查
- 但其他直接使用 `supabaseAdmin` 的地方可能缺少检查
- 如果环境变量未配置，会导致运行时错误

**已检查的文件**:
- ✅ `lib/db/index.ts` - 有检查
- ⚠️ `app/api/orders/by-session/route.js` - 创建新客户端，但可能缺少检查
- ⚠️ `app/api/webhook/route.js` - 创建新客户端，但可能缺少检查

**建议修复**:
确保所有使用 `supabaseAdmin` 的地方都有空值检查：
```javascript
if (!supabaseAdmin) {
  throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase admin not configured')
}
```

**严重程度**: 🟡 中

---

### 4. 硬编码的默认事件数据

**位置**: `app/api/events/[id]/route.js:12-27`

**问题**:
- 硬编码了 "ridiculous-chicken" 事件数据
- 这违反了数据驱动原则
- 难以维护和扩展

**代码**:
```javascript
if (id === 'ridiculous-chicken') {
  const defaultEvent = {
    id: 'ridiculous-chicken',
    title: 'Ridiculous Chicken Night Event',
    // ... 硬编码数据
  }
  return NextResponse.json({ success: true, data: defaultEvent })
}
```

**建议修复**:
- 将默认事件数据移到数据库
- 或者移到配置文件
- 或者使用环境变量

**严重程度**: 🟡 中

---

### 5. 缺少错误处理的异步操作

**位置**: 多个 API 路由

**问题**:
- 某些异步操作缺少错误处理
- 例如：`app/api/webhook/route.js:104-108` 中获取默认事件时没有检查错误

**代码示例**:
```javascript
// app/api/webhook/route.js:104-108
const { data: defaultEvent } = await supabase
  .from('events')
  .select('id')
  .limit(1)
  .single()

eventId = defaultEvent?.id || '45091d37-7252-43c7-93c8-a7033d28af31'
```

**问题**:
- 如果查询失败，`defaultEvent` 可能为 `null`
- 但代码直接使用 `defaultEvent?.id`，可能使用错误的默认值

**建议修复**:
```javascript
const { data: defaultEvent, error: defaultEventError } = await supabase
  .from('events')
  .select('id')
  .limit(1)
  .single()

if (defaultEventError || !defaultEvent) {
  logger.warn('Failed to get default event, using fallback', { error: defaultEventError })
}
```

**严重程度**: 🟡 中

---

### 6. 数据库字段映射已修复（但需确认一致性）

**位置**: `lib/ticket-service.js`

**状态**: ✅ 已修复

**说明**:
- `stripe_session_id` 字段映射已正确使用
- 但需要确认所有相关代码都使用正确的字段名

**已验证**:
- ✅ `lib/ticket-service.js:41, 86` - 使用 `stripe_session_id`
- ✅ `app/api/orders/by-session/route.js:58` - 使用 `stripe_session_id`
- ✅ `app/api/webhook/route.js:55, 67` - 使用 `stripe_session_id`

**建议**:
- 继续监控是否有地方仍使用旧的 `session_id` 字段

**严重程度**: 🟡 低（预防性）

---

## 🟢 轻微问题

### 7. 缺少输入验证

**位置**: 部分 API 路由

**问题**:
- 某些 API 缺少对输入参数的完整验证
- 例如：`app/api/events/[id]/route.js` 中，`id` 参数没有验证是否为有效的 UUID

**建议修复**:
```javascript
// 验证 UUID 格式
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (id !== 'ridiculous-chicken' && !uuidRegex.test(id)) {
  throw ErrorHandler.validationError('INVALID_ID', 'Invalid event ID format')
}
```

**严重程度**: 🟢 低

---

### 8. 代码重复

**位置**: 多个文件

**问题**:
- `generateShortTicketId()` 函数在多个文件中重复定义
- `app/api/webhook/route.js:191`
- `app/api/orders/by-session/route.js:10`

**建议修复**:
- 将 `generateShortTicketId()` 移到共享工具文件
- 例如：`lib/ticket-utils.js`

**严重程度**: 🟢 低（代码质量）

---

## ✅ 已确认修复的问题

### 1. 字段映射错误 ✅
- **位置**: `lib/ticket-service.js`
- **状态**: 已修复
- **验证**: 所有相关代码都使用 `stripe_session_id`

### 2. API 路由 404 错误 ✅
- **位置**: `app/api/auth/*`, `app/api/events/*`
- **状态**: 已修复
- **验证**: 所有必要的 API 路由都已创建

### 3. 错误处理 ✅
- **位置**: 大部分 API 路由
- **状态**: 大部分 API 都有适当的错误处理
- **验证**: 使用 `ErrorHandler` 和 `handleApiError`

---

## 📊 代码质量指标

| 指标 | 状态 | 说明 |
|------|------|------|
| 错误处理覆盖率 | 🟢 良好 | 大部分 API 都有 try-catch |
| 安全性 | 🟡 需改进 | 硬编码密钥问题 |
| 代码重复 | 🟡 中等 | 部分函数重复 |
| 依赖管理 | 🟡 中等 | Prisma 未使用但导入 |
| 数据验证 | 🟢 良好 | 大部分 API 有验证 |
| 环境变量检查 | 🟢 良好 | 大部分地方有检查 |

---

## 🔧 建议的修复优先级

### 立即修复（P0）
1. **Webhook 密钥硬编码** - 安全风险
2. **supabaseAdmin 空值检查** - 可能导致运行时错误

### 短期修复（P1）
3. **Prisma 清理** - 代码质量
4. **错误处理改进** - 稳定性

### 长期改进（P2）
5. **硬编码数据重构** - 可维护性
6. **代码重复消除** - 代码质量
7. **输入验证增强** - 安全性

---

## 📝 总结

本次扫描发现了 **8 个主要问题**，其中：
- 🔴 **2 个严重问题**需要立即修复（特别是安全相关）
- 🟡 **4 个中等问题**需要在短期内修复
- 🟢 **2 个轻微问题**可以逐步改进

**总体评估**: 项目代码质量良好，但存在一些需要关注的安全和代码质量问题。建议优先修复安全相关的问题。

---

## 🔍 后续建议

1. **定期扫描**: 建议定期进行代码扫描和审计
2. **代码审查**: 在合并 PR 前进行代码审查
3. **自动化测试**: 增加单元测试和集成测试
4. **安全审计**: 定期进行安全审计
5. **依赖清理**: 清理未使用的依赖

---

**报告生成时间**: 2025-01-29  
**扫描工具**: 静态代码分析 + 架构审计

