# PartyTix 环境配置指南

## 1. Supabase 配置

### 步骤 1: 创建 Supabase 项目
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 填写项目信息：
   - Name: `partytix-mvp`
   - Database Password: 设置强密码
   - Region: 选择最近的区域
4. 等待项目创建完成

### 步骤 2: 获取 Supabase 配置信息
1. 在项目 Dashboard 中，进入 Settings > API
2. 复制以下信息：
   - Project URL
   - Project API Keys > anon public
   - Project API Keys > service_role (secret)

### 步骤 3: 设置数据库
1. 进入 SQL Editor
2. 复制 `database-setup.sql` 文件内容
3. 粘贴并执行 SQL 脚本
4. 验证数据是否正确插入

## 2. 环境变量配置

创建 `.env.local` 文件：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (可选)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Database Configuration (可选)
DATABASE_URL=your_database_url
```

## 3. 验证配置

### 测试 Supabase 连接
```bash
# 运行应用程序
npm run dev

# 访问管理员界面
http://localhost:3000/admin/dashboard
```

### 预期结果
- 管理员界面显示真实数据
- 统计卡片显示非零数字
- 商家、活动、客户列表有内容

## 4. 示例数据

配置完成后，您将看到：

### 用户数据
- 1 个管理员用户
- 2 个普通用户
- 2 个商家用户

### 商家数据
- Music Events Co.
- Concert Hall

### 活动数据
- Summer Music Festival
- Jazz Night
- Food & Wine Festival

### 邀请码
- 2 个活跃的邀请码

## 5. 故障排除

### 常见问题

1. **数据不显示**
   - 检查 Supabase 连接配置
   - 验证环境变量是否正确设置
   - 确认数据库脚本已执行

2. **API 错误**
   - 检查 Supabase 服务状态
   - 验证 API 密钥权限
   - 查看浏览器控制台错误

3. **权限问题**
   - 确认 RLS 策略设置正确
   - 检查用户角色权限

### 调试步骤

1. 检查环境变量：
```bash
# 在应用程序中打印环境变量
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

2. 测试 API 端点：
```bash
curl http://localhost:3000/api/admin/stats
```

3. 查看 Supabase 日志：
   - 进入 Supabase Dashboard > Logs
   - 查看 API 和数据库日志

## 6. 生产环境部署

### Vercel 部署
1. 在 Vercel 项目设置中添加环境变量
2. 确保所有 Supabase 配置正确
3. 部署应用程序

### 环境变量优先级
1. `.env.local` (本地开发)
2. Vercel Environment Variables (生产环境)
3. 默认值 (应用程序内置)

## 7. 安全注意事项

- 不要将 `.env.local` 文件提交到版本控制
- 定期轮换 API 密钥
- 在生产环境中使用严格的 RLS 策略
- 监控 API 使用情况
