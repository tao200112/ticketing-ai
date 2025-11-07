# OAuth 错误诊断指南

## 问题

即使改进了错误处理逻辑，仍然显示 "Database error saving new user"。

## 可能的原因

### 1. 代码尚未部署
- **检查**：确认 Vercel 已部署最新代码
- **解决**：等待 Vercel 自动部署完成，或手动触发部署

### 2. 错误对象结构不同
- **检查**：查看 Vercel 函数日志中的实际错误对象结构
- **解决**：根据实际错误结构调整错误处理逻辑

### 3. 错误发生在其他位置
- **检查**：确认错误是否真的来自 `app/api/auth/callback/route.js`
- **解决**：检查是否有其他中间件或错误处理逻辑

## 诊断步骤

### 步骤 1: 查看 Vercel 函数日志

1. 进入 Vercel Dashboard
2. 选择项目 `ticketing-ai`
3. 进入 **Functions** 标签
4. 找到 `/api/auth/callback` 函数
5. 查看最近的日志，搜索：
   - `"Error creating user"`
   - `"OAuth callback error"`
   - `"errorCode"`
   - `"errorKeys"`

### 步骤 2: 检查错误对象结构

在日志中查找包含以下信息的条目：

```json
{
  "errorCode": "...",
  "errorMessage": "...",
  "errorDetails": "...",
  "errorHint": "...",
  "errorKeys": ["..."],
  "errorType": "...",
  "errorString": "...",
  "errorJson": "...",
  "fullError": "..."
}
```

### 步骤 3: 分析错误信息

根据日志中的信息：

1. **如果有 `errorCode`**：
   - 检查是否匹配我们处理的错误代码（23505, 23502, 23514, 等）
   - 如果不匹配，添加对应的处理逻辑

2. **如果有 `errorMessage`**：
   - 检查为什么没有使用这个消息
   - 可能是条件判断有问题

3. **如果 `errorKeys` 显示不同的键名**：
   - 错误对象可能使用了不同的属性名
   - 需要调整错误提取逻辑

4. **如果所有字段都是 `null` 或 `undefined`**：
   - 错误对象可能是一个空对象或结构完全不同
   - 需要检查 Supabase 客户端返回的错误格式

## 改进的错误处理逻辑

最新版本已经：

1. ✅ 处理字符串和数字格式的错误代码
2. ✅ 从多个可能的位置提取错误消息
3. ✅ 记录完整的错误对象结构
4. ✅ 如果使用默认消息，记录警告并显示可用键名

## 如果问题仍然存在

请提供以下信息：

1. **Vercel 日志中的错误对象结构**（从 "Error creating user" 日志条目）
2. **错误代码**（如果有）
3. **错误消息**（如果有）
4. **errorKeys 数组**（显示错误对象有哪些键）

这样我可以根据实际的错误结构进一步调整错误处理逻辑。

## 临时解决方案

如果急需解决，可以：

1. **检查数据库约束**：运行 `supabase/migrations/verify_users_table_structure.sql`
2. **检查迁移状态**：确认所有迁移都已运行
3. **手动测试插入**：在 Supabase SQL Editor 中尝试手动插入用户，查看实际错误

