# Vercel 环境变量配置指南

## 🔧 必需的环境变量

在 Vercel 部署后，您需要在 Vercel Dashboard 中配置以下环境变量：

### 1. Supabase 配置
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Stripe 配置
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. 数据库配置
```
DATABASE_URL=your_database_connection_string
```

### 4. QR 加密盐值
```
QR_SALT=your_secure_random_string
```

## 📋 配置步骤

### 步骤 1: 配置 Vercel 环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加上述所有环境变量

### 步骤 2: 配置 Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public** key
5. 将这些值添加到 Vercel 环境变量中

### 步骤 3: 运行数据库迁移

在 Supabase SQL Editor 中运行以下 SQL：

```sql
-- 复制 supabase/migrations/partytix_mvp.sql 的内容
-- 或者直接运行迁移文件
```

### 步骤 4: 配置 Stripe

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 获取 API 密钥
3. 配置 Webhook 端点指向您的 Vercel 部署 URL

## 🔍 故障排除

### 问题 1: 邀请码验证失败

**原因**: 环境变量 `ADMIN_INVITE_CODES` 在服务器重启后丢失

**解决方案**: 
- 确保 Supabase 数据库已正确配置
- 运行数据库迁移创建 `admin_invite_codes` 表
- 管理员面板现在会自动使用 Supabase 存储邀请码

### 问题 2: 用户认证失败

**原因**: Supabase 环境变量未正确配置

**解决方案**:
- 检查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 确保 Supabase 项目已启用
- 检查 Supabase 项目的 API 设置

### 问题 3: 商家注册失败

**原因**: 数据库表不存在或环境变量缺失

**解决方案**:
- 运行完整的数据库迁移
- 确保所有必需的环境变量都已配置
- 检查 Supabase 连接状态

## 📝 验证配置

部署后，您可以通过以下方式验证配置：

1. **检查 Supabase 连接**:
   - 访问 `/api/auth/register` 端点
   - 查看控制台日志确认 Supabase 连接状态

2. **测试邀请码功能**:
   - 登录管理员面板
   - 生成新的邀请码
   - 尝试使用邀请码注册商家

3. **验证用户认证**:
   - 尝试用户注册和登录
   - 检查用户数据是否正确保存到 Supabase

## 🚀 部署后操作

1. **重新部署**: 配置环境变量后，重新部署应用
2. **清除缓存**: 清除浏览器缓存和 Vercel 缓存
3. **测试功能**: 全面测试所有功能确保正常工作

## 📞 获取帮助

如果仍然遇到问题：

1. 检查 Vercel 部署日志
2. 查看浏览器控制台错误
3. 验证 Supabase 项目状态
4. 确认所有环境变量格式正确

---

**注意**: 确保所有环境变量在 Vercel 中都是 **Production** 环境可用的。
