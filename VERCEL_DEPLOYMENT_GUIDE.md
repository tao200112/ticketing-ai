# Vercel 部署配置指南

## 🚀 部署步骤

### 1. 访问 Vercel
- 打开 [vercel.com](https://vercel.com)
- 使用 GitHub 账号登录

### 2. 导入项目
- 点击 "New Project"
- 选择您的 GitHub 仓库 `ticketing-ai`
- 选择分支 `feat/partytix-mvp`

### 3. 配置环境变量
在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量：
```
NEXT_PUBLIC_SITE_URL=https://your-project-name.vercel.app
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的Supabase服务密钥
```

#### 可选的环境变量（用于真实支付）：
```
STRIPE_SECRET_KEY=你的Stripe密钥
STRIPE_PUBLISHABLE_KEY=你的Stripe公钥
STRIPE_WEBHOOK_SECRET=你的Stripe Webhook密钥
```

### 4. 部署
- 点击 "Deploy"
- 等待部署完成
- 获得线上 URL

## 🔧 重要说明

### NEXT_PUBLIC_SITE_URL 配置
- **本地开发**: `http://localhost:3000`
- **Vercel部署**: `https://your-project-name.vercel.app`

这个环境变量确保：
- ✅ 付款成功后跳转到正确的云端URL
- ✅ 演示模式和真实支付都使用正确的域名
- ✅ 避免跳转到本地开发服务器

### 演示模式
如果未配置 Stripe 密钥，系统会自动使用演示模式：
- ✅ 无需真实支付
- ✅ 生成演示票券和二维码
- ✅ 完整的用户体验测试

## 🎯 部署后测试

1. **访问线上URL** - 应该看到网站
2. **测试付款流程** - 点击购票按钮
3. **检查跳转** - 付款成功后应该跳转到云端success页面
4. **验证二维码** - 应该正常生成和显示

## 🚨 常见问题

### 问题：付款后跳转到localhost
**解决方案**: 确保在Vercel中设置了 `NEXT_PUBLIC_SITE_URL` 环境变量

### 问题：二维码不显示
**解决方案**: 已修复，现在应该正常工作

### 问题：404错误
**解决方案**: 确保部署的是最新代码，检查GitHub同步状态
