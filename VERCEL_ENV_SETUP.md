# Vercel 环境变量配置指南

## 🚨 当前问题
- 新页面返回 404 错误
- Sentry 返回 403 错误
- merchantID 缺失导致应用错误

## 🔧 解决方案

### 1. 登录 Vercel Dashboard
访问：https://vercel.com/dashboard

### 2. 选择项目
找到并点击 `ticketing-ai` 项目

### 3. 进入环境变量设置
- 点击 `Settings` 标签
- 点击 `Environment Variables` 选项

### 4. 添加以下环境变量

**必需的环境变量：**

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `NEXT_PUBLIC_SITE_URL` | `https://ticketing-ai-six.vercel.app` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://htaqcvnyipiqdbmvvfvj.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5K_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM` | Production, Preview, Development |
| `SMTP_HOST` | `smtp.gmail.com` | Production, Preview, Development |
| `SMTP_PORT` | `587` | Production, Preview, Development |
| `SMTP_USER` | `taoliu001711@gmail.com` | Production, Preview, Development |
| `SMTP_PASS` | `dmtq zgus ljgq grez` | Production, Preview, Development |
| `UPSTASH_REDIS_URL` | `https://teaching-piglet-24936.upstash.io` | Production, Preview, Development |
| `UPSTASH_REDIS_TOKEN` | `AWFoAAIncDI1NTFhNzhmODljZTY0ZDk0YmU0YzNiY2EwZDMyYjY3ZHAyMjQ5MzY` | Production, Preview, Development |
| `SENTRY_DSN` | `https://o1336925.ingest.sentry.io/6606312` | Production, Preview, Development |
| `MERCHANT_ID` | `default-merchant-id` | Production, Preview, Development |

### 5. 重新部署
设置完环境变量后：
1. 点击 `Deployments` 标签
2. 找到最新的部署记录
3. 点击 `Redeploy` 按钮
4. 选择 `Use existing Build Cache` 为 `No`

## 🔍 验证步骤

部署完成后，测试以下页面：

1. **调试页面**：`https://ticketing-ai-six.vercel.app/debug-vercel`
2. **调试 API**：`https://ticketing-ai-six.vercel.app/api/debug-routes`
3. **简单测试**：`https://ticketing-ai-six.vercel.app/simple-test`
4. **邮箱测试**：`https://ticketing-ai-six.vercel.app/email-test`

## ⚠️ 注意事项

1. **确保所有变量都设置为所有环境**（Production, Preview, Development）
2. **SENTRY_DSN 必须正确**，否则会出现 403 错误
3. **MERCHANT_ID 必须设置**，否则应用会报错
4. **重新部署是必需的**，环境变量更改后不会自动生效

## 🐛 如果仍然有问题

1. 检查 Vercel 构建日志
2. 确认分支 `feat/identity-rbac-errors` 已正确部署
3. 检查是否有其他 Vercel 配置冲突