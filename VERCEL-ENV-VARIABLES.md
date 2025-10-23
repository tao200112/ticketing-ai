# 🚀 Vercel 部署环境变量配置

## 📋 必需的环境变量

### 1. 数据库配置
```
DATABASE_URL
```
**值**: `file:./dev.db` (开发) 或 `postgresql://username:password@host:port/database` (生产)
**说明**: 数据库连接字符串

### 2. 服务器安全密钥
```
SERVER_SALT
```
**值**: `your-very-long-random-salt-key-for-production`
**说明**: HMAC 签名密钥，用于二维码验证
**⚠️ 重要**: 生产环境必须使用强随机密钥

### 3. Stripe 支付配置
```
STRIPE_SECRET_KEY
```
**值**: `sk_live_...` (生产) 或 `sk_test_...` (测试)
**说明**: Stripe 私钥

```
STRIPE_PUBLISHABLE_KEY
```
**值**: `pk_live_...` (生产) 或 `pk_test_...` (测试)
**说明**: Stripe 公钥

```
STRIPE_WEBHOOK_SECRET
```
**值**: `whsec_...`
**说明**: Stripe Webhook 密钥

## 🔧 可选的环境变量

### 4. 支付链接 (可选)
```
NEXT_PUBLIC_REGULAR_TICKET_LINK
```
**值**: `https://buy.stripe.com/...`
**说明**: 普通票支付链接

```
NEXT_PUBLIC_SPECIAL_TICKET_LINK
```
**值**: `https://buy.stripe.com/...`
**说明**: 特殊票支付链接

### 5. Supabase 配置 (可选)
```
NEXT_PUBLIC_SUPABASE_URL
```
**值**: `https://your-project.supabase.co`
**说明**: Supabase 项目 URL

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
**值**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**说明**: Supabase 匿名密钥

## 🎯 Vercel 设置步骤

### 1. 登录 Vercel Dashboard
访问: https://vercel.com/dashboard

### 2. 选择项目
找到您的 `ticketing-ai` 项目

### 3. 进入设置
点击项目 → Settings → Environment Variables

### 4. 添加环境变量
点击 "Add New" 按钮，逐个添加以下变量：

#### 必需变量 (5个)
```
DATABASE_URL = file:./dev.db
SERVER_SALT = your-production-salt-key
STRIPE_SECRET_KEY = sk_live_...
STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
```

#### 可选变量 (4个)
```
NEXT_PUBLIC_REGULAR_TICKET_LINK = https://buy.stripe.com/...
NEXT_PUBLIC_SPECIAL_TICKET_LINK = https://buy.stripe.com/...
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. 设置环境范围
- **Production**: 生产环境
- **Preview**: 预览环境
- **Development**: 开发环境

### 6. 重新部署
添加环境变量后，点击 "Redeploy" 重新部署项目

## 🔐 安全配置建议

### 生产环境密钥
```bash
# 生成强随机密钥
SERVER_SALT=$(openssl rand -base64 32)

# 使用 Stripe 正式密钥
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 数据库配置
```bash
# 生产环境使用 PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database
```

## 📊 环境变量检查清单

### ✅ 必需变量 (5个)
- [ ] `DATABASE_URL`
- [ ] `SERVER_SALT`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`

### ✅ 可选变量 (4个)
- [ ] `NEXT_PUBLIC_REGULAR_TICKET_LINK`
- [ ] `NEXT_PUBLIC_SPECIAL_TICKET_LINK`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🚨 常见问题

### 1. 数据库连接失败
**问题**: `DATABASE_URL` 配置错误
**解决**: 检查数据库连接字符串格式

### 2. Stripe 支付失败
**问题**: Stripe 密钥配置错误
**解决**: 验证密钥格式和权限

### 3. 二维码验证失败
**问题**: `SERVER_SALT` 不匹配
**解决**: 确保本地和服务器使用相同的密钥

## 🎯 快速配置

### 最小配置 (必需)
```
DATABASE_URL=file:./dev.db
SERVER_SALT=your-secret-salt
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 完整配置 (推荐)
```
DATABASE_URL=postgresql://user:pass@host:port/db
SERVER_SALT=your-very-long-random-salt-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_REGULAR_TICKET_LINK=https://buy.stripe.com/...
NEXT_PUBLIC_SPECIAL_TICKET_LINK=https://buy.stripe.com/...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 总结

**总计**: 9 个环境变量
- **必需**: 5 个
- **可选**: 4 个

**部署后验证**:
1. 检查网站是否正常加载
2. 测试支付功能
3. 验证二维码生成
4. 检查管理面板


