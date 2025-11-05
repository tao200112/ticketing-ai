# 本地开发配置指南

## 问题分析

您现在面临的困境：
- Supabase Site URL 只能设置一个连接
- 需要同时支持本地开发和线上部署
- 本地功能缺失，需要修复

## 🎯 推荐方案：先本地，后线上

### 为什么先本地？

1. ✅ **开发效率高**：本地调试更快速
2. ✅ **成本低**：本地开发无额外费用
3. ✅ **安全**：不会影响线上数据
4. ✅ **调试方便**：可以随时查看日志

### 后续线上部署的优势

完成本地开发后：
- ✅ 配置已经验证过
- ✅ 功能已经测试过
- ✅ 可以批量迁移数据
- ✅ 减少线上问题

## 📋 本地开发配置步骤

### 步骤 1: 配置 Supabase

#### 1.1 设置 Supabase Site URL

访问：https://supabase.com/dashboard/project/htaqcvnyipiqdbmvvfvj/settings/auth

**设置 Site URL 为本地开发环境：**
```
http://localhost:3000
```

#### 1.2 配置 Redirect URLs

在 **Redirect URLs** 中添加：

```
http://localhost:3000/**
http://localhost:3000/auth/callback
http://localhost:3001/**
```

### 步骤 2: 检查本地环境变量

确保 `.env.local` 配置正确：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://htaqcvnyipiqdbmvvfvj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend Configuration
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/v1

# Stripe (可选，如果需要支付功能)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 步骤 3: 修复本地功能

#### 3.1 创建缺失的管理员 API 路由

管理员 API 路由已经创建，确保它们正常运行：

```bash
# 检查路由文件是否存在
ls app/api/admin/
```

应该看到：
- `stats/route.js`
- `merchants/route.js`
- `events/route.js`
- `invite-codes/route.js`
- `customers/route.js`
- `tickets/route.js`

#### 3.2 修复 Navbar 事件处理器

NavbarPartyTix 组件的事件处理器已经修复。

#### 3.3 测试本地功能

```bash
# 启动前端
npm run dev

# 在另一个终端启动后端
npm run dev:backend
```

### 步骤 4: 验证功能

#### 4.1 访问本地应用

打开浏览器访问：
- 前端：http://localhost:3000
- 后端：http://localhost:3001

#### 4.2 测试核心功能

1. **首页浏览**
   - 访问 http://localhost:3000
   - 应该能看到事件列表

2. **管理员面板**
   - 访问 http://localhost:3000/admin
   - 输入密码：1461
   - 应该能查看统计数据

3. **商户控制台**
   - 访问 http://localhost:3000/merchant/auth/login
   - 商户登录测试

4. **用户登录**
   - 访问 http://localhost:3000/auth/login
   - 用户登录测试

## 🔄 本地到线上的迁移策略

### 完成后准备线上部署

#### 准备步骤

1. **备份本地配置**
   ```bash
   cp .env.local .env.local.backup
   ```

2. **创建线上环境变量文件**
   ```bash
   cp env.example .env.production
   ```

3. **更新 Supabase 配置**
   - 将 Site URL 改为线上地址
   - 更新 Redirect URLs

4. **配置 Vercel 环境变量**
   - 在 Vercel Dashboard 中添加所有环境变量
   - 确保与本地 `.env.local` 一致

### 快速切换本地/线上配置

创建切换脚本：

```powershell
# scripts/switch-to-local.ps1
Write-Host "切换到本地开发环境..."

# 更新 .env.local 中的配置
$envContent = Get-Content .env.local
$envContent = $envContent -replace 'NEXT_PUBLIC_SITE_URL=.*', 'NEXT_PUBLIC_SITE_URL=http://localhost:3000'

$envContent | Set-Content .env.local
Write-Host "✅ 已切换到本地环境"
```

## 📊 当前状态检查清单

### 本地开发状态

- [x] 前端服务正常 (http://localhost:3000)
- [x] 后端服务正常 (http://localhost:3001)
- [x] 管理员 API 路由已创建
- [x] 环境变量已配置
- [ ] 数据库连接需要验证
- [ ] 数据访问需要测试

### 待修复功能

1. **数据库连接**
   - 检查 Supabase 连接
   - 验证表结构
   - 测试数据查询

2. **RLS 策略**
   - 配置或暂时禁用 RLS
   - 确保数据可访问

3. **功能测试**
   - 测试用户注册/登录
   - 测试事件创建
   - 测试票务购买

## 🎯 下一步行动

### 立即执行

1. ✅ 更新 Supabase Site URL 为本地地址
2. ✅ 测试本地应用访问
3. ✅ 检查数据库连接
4. ✅ 修复数据访问问题

### 本地验证完成后

1. 配置线上环境变量
2. 更新 Supabase 为线上地址
3. 部署到 Vercel
4. 测试线上功能

## 💡 建议

**推荐方案：先本地，后线上**

原因：
1. 本地开发更快
2. 容易调试问题
3. 不担心影响线上用户
4. 配置验证后再上线更安全

预计时间线：
- 本地修复：1-2 小时
- 功能测试：30 分钟
- 线上部署：30 分钟

总计：2-3 小时完成整个流程






