# 商户注册问题诊断报告

## 🔍 问题分析

### 当前状态
- 商户注册页面显示："Registration failed, please try again"
- API返回HTML而不是JSON（错误页面）
- 环境变量未配置

### 根本原因
1. **Supabase未配置** ❌
   - `NEXT_PUBLIC_SUPABASE_URL` 缺失
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 缺失

2. **邀请码未配置** ❌
   - `ADMIN_INVITE_CODES` 环境变量缺失

3. **API降级失败** ❌
   - 降级到环境变量存储时失败

## 🛠️ 解决方案

### 方案1：配置Supabase（推荐）

在Vercel Dashboard中设置以下环境变量：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 邀请码配置
ADMIN_INVITE_CODES=[{"id":"invite_1761335678461","code":"INV_MH59SBGD_D20Z7C","isActive":true,"maxEvents":10,"usedBy":null,"usedAt":null,"expiresAt":"2025-11-23T19:54:38.461Z","createdAt":"2025-10-24T19:54:38.461Z"}]
```

### 方案2：仅使用环境变量（临时）

如果不想配置Supabase，可以只设置邀请码：

```bash
ADMIN_INVITE_CODES=[{"id":"invite_1761335678461","code":"INV_MH59SBGD_D20Z7C","isActive":true,"maxEvents":10,"usedBy":null,"usedAt":null,"expiresAt":"2025-11-23T19:54:38.461Z","createdAt":"2025-10-24T19:54:38.461Z"}]
```

## 📋 配置步骤

### 1. 访问Vercel Dashboard
- 登录 https://vercel.com
- 选择项目 `ticketing-ai`
- 进入 Settings > Environment Variables

### 2. 添加环境变量
- 点击 "Add New"
- 设置变量名和值
- 选择环境：Production, Preview, Development
- 点击 "Save"

### 3. 重新部署
```bash
npx vercel --prod --yes
```

## 🧪 测试步骤

### 1. 检查环境变量
访问：https://ticketing-8vq4e6uwu-taoliu0711-7515s-projects.vercel.app/api/merchant/register

应该返回JSON而不是HTML。

### 2. 测试注册
使用以下数据测试：
- Email: test@merchant.com
- Name: Test Merchant
- Business Name: Test Business
- Phone: 1234567890
- Password: password123
- Invite Code: INV_MH59SBGD_D20Z7C

## 🔧 调试信息

### 当前API状态
- 返回HTML错误页面
- 环境变量未配置
- 降级机制失败

### 预期行为
- 返回JSON响应
- 成功创建商户账户
- 重定向到商户仪表板

## 📞 支持

如果问题持续存在，请检查：
1. Vercel环境变量是否正确设置
2. 网络连接是否正常
3. API路由是否正常工作

## 🎯 下一步

1. 配置环境变量
2. 重新部署应用
3. 测试商户注册功能
4. 验证数据保存
