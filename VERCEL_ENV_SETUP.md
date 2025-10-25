# Vercel 环境变量配置指南

## 🔧 问题诊断

**当前问题**: 部署时出现 "Module not found" 错误
**根本原因**: Vercel 环境变量配置不正确

## 📊 当前配置问题

### 1. vercel.json 配置错误
```json
// ❌ 错误配置 - 使用 @ 前缀引用不存在的环境变量
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key",
  // ...
}
```

### 2. 环境变量未在 Vercel 控制台设置

## ✅ 解决方案

### 步骤 1: 修复 vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### 步骤 2: 在 Vercel 控制台设置环境变量

**进入 Vercel 项目设置 → Environment Variables，添加以下变量**:

#### Supabase 配置
```
NEXT_PUBLIC_SUPABASE_URL = https://htaqcvnyipiqdbmvvfvj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM
```

#### Stripe 配置
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = [您的 Stripe 公钥]
STRIPE_SECRET_KEY = [您的 Stripe 私钥]
STRIPE_WEBHOOK_SECRET = [您的 Stripe Webhook 密钥]
```

#### 应用配置
```
NEXT_PUBLIC_APP_URL = https://ticketing-ai-ypyj.vercel.app
```

### 步骤 3: 重新部署

1. 保存环境变量设置
2. 触发重新部署
3. 检查部署日志

## 🎯 预期结果

**修复后应该**:
- ✅ 构建成功 (无 "Module not found" 错误)
- ✅ 所有环境变量正确加载
- ✅ 应用正常运行

## 📝 注意事项

1. **环境变量作用域**: 确保设置为 Production, Preview, Development
2. **敏感信息**: 不要将真实密钥提交到代码仓库
3. **重新部署**: 环境变量更改后需要重新部署才能生效