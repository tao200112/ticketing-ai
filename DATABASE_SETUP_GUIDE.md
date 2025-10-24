# 数据库设置指南

## 🎯 目标
设置完整的用户注册和登录系统，将用户信息存储到数据库中。

## 📋 需要的环境变量

### 1. Supabase 配置
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 管理员邀请码
```bash
ADMIN_INVITE_CODES=[{"code":"WELCOME2024","isActive":true,"expiresAt":"2025-12-31T23:59:59Z"}]
```

## 🗄️ 数据库设置步骤

### 步骤 1: 创建 Supabase 项目
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和 API Key

### 步骤 2: 运行数据库迁移
在 Supabase SQL 编辑器中运行 `supabase/migrations/complete_database_setup.sql`

### 步骤 3: 配置环境变量
在 Vercel 项目设置中添加环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_INVITE_CODES`

## 🧪 测试账号

### 默认管理员账号
- 邮箱: `admin@partytix.com`
- 密码: `admin123`

### 默认邀请码
- 邀请码: `WELCOME2024`

## 🔄 注册流程

### 用户注册
1. 访问 `/auth/register`
2. 填写用户信息
3. 系统将用户信息存储到 `users` 表

### 商户注册
1. 访问 `/merchant/auth/register`
2. 填写商户信息
3. 输入有效的邀请码
4. 系统将创建用户记录和商户记录

## 🔐 登录流程

### 用户登录
1. 访问 `/auth/login`
2. 输入邮箱和密码
3. 系统从数据库验证用户信息

### 商户登录
1. 访问 `/merchant/auth/login`
2. 输入邮箱和密码
3. 系统验证用户角色为 'merchant'

## 📊 数据库表结构

### users 表
- 存储所有用户信息（普通用户、商户、管理员）
- 包含密码哈希、角色、状态等

### merchants 表
- 存储商户详细信息
- 关联到 users 表

### admin_invite_codes 表
- 存储管理员邀请码
- 控制商户注册权限

### orders 和 tickets 表
- 存储订单和票据信息
- 关联用户和商户

## 🚀 部署后测试

1. **测试用户注册**:
   - 访问生产环境的 `/auth/register`
   - 创建新用户账号

2. **测试商户注册**:
   - 访问生产环境的 `/merchant/auth/register`
   - 使用邀请码 `WELCOME2024` 注册商户

3. **测试登录**:
   - 使用注册的账号登录
   - 验证用户信息正确显示

## 🔧 故障排除

### 如果注册失败
1. 检查 Supabase 环境变量是否正确
2. 确认数据库表已创建
3. 检查邀请码是否有效

### 如果登录失败
1. 确认用户已注册
2. 检查密码是否正确
3. 验证用户角色设置

## 📝 下一步

设置完成后，您可以：
1. 注册新用户和商户
2. 创建活动
3. 处理订单
4. 管理票据

所有数据将安全存储在 Supabase 数据库中！
