# Supabase 数据库配置指南

## 🎯 目标
配置真实的Supabase数据库，让管理员界面显示实际的用户、商家和活动数据。

## 📋 步骤 1: 创建 Supabase 项目

### 1.1 注册和登录
1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 账号登录（推荐）

### 1.2 创建新项目
1. 点击 "New Project"
2. 填写项目信息：
   - **Name**: `partytix-mvp`
   - **Database Password**: 设置一个强密码（保存好，稍后需要）
   - **Region**: 选择离您最近的区域
3. 点击 "Create new project"
4. 等待项目创建完成（约2-3分钟）

## 📋 步骤 2: 获取配置信息

### 2.1 获取 API 配置
1. 在项目 Dashboard 中，点击左侧菜单的 **Settings**
2. 点击 **API**
3. 复制以下信息：
   - **Project URL** (例如: `https://your-project.supabase.co`)
   - **anon public** key (以 `eyJ` 开头的长字符串)
   - **service_role** key (以 `eyJ` 开头的长字符串，**注意：这是敏感信息**)

### 2.2 设置环境变量
在项目根目录创建或编辑 `.env.local` 文件：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 📋 步骤 3: 设置数据库结构

### 3.1 打开 SQL Editor
1. 在 Supabase Dashboard 中，点击左侧菜单的 **SQL Editor**
2. 点击 **New query**

### 3.2 执行数据库脚本
1. 复制 `database-setup.sql` 文件的全部内容
2. 粘贴到 SQL Editor 中
3. 点击 **Run** 按钮执行脚本
4. 等待执行完成

### 3.3 验证数据
执行以下查询来验证数据是否正确插入：

```sql
-- 检查用户数据
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Merchants', COUNT(*) FROM merchants
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Invite Codes', COUNT(*) FROM admin_invite_codes;
```

## 📋 步骤 4: 配置应用程序

### 4.1 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 4.2 测试连接
1. 访问 `http://localhost:3000/admin/dashboard`
2. 检查是否显示真实数据而不是示例数据

## 📋 步骤 5: 添加真实数据

### 5.1 通过应用程序注册用户
1. 访问 `http://localhost:3000/auth/register`
2. 注册几个测试用户
3. 注册几个商家账户

### 5.2 创建活动
1. 登录商家账户
2. 创建一些测试活动
3. 在管理员界面查看这些活动

### 5.3 验证数据同步
1. 在管理员界面查看统计数据
2. 检查用户、商家、活动列表
3. 确认显示的是真实数据

## 🔧 故障排除

### 问题 1: 环境变量未生效
**症状**: API 返回 "Database not configured" 错误
**解决方案**:
1. 确认 `.env.local` 文件在项目根目录
2. 重启开发服务器
3. 检查环境变量名称是否正确

### 问题 2: 数据库连接失败
**症状**: API 返回 500 错误
**解决方案**:
1. 检查 Supabase 项目是否正常运行
2. 验证 API 密钥是否正确
3. 检查网络连接

### 问题 3: 数据不显示
**症状**: 管理员界面显示空数据
**解决方案**:
1. 确认数据库脚本已执行
2. 检查 RLS (Row Level Security) 设置
3. 验证用户权限

## 📊 预期结果

配置成功后，管理员界面应该显示：

### 统计卡片
- **用户数量**: 实际注册的用户数
- **商家数量**: 实际注册的商家数
- **活动数量**: 实际创建的活动数
- **订单数量**: 实际的订单数
- **票务数量**: 实际的票务数

### 数据列表
- **商家列表**: 显示所有注册的商家及其详细信息
- **活动列表**: 显示所有创建的活动及其详细信息
- **客户列表**: 显示所有注册的用户
- **邀请码列表**: 显示所有生成的邀请码

## 🚀 下一步

1. **生产环境部署**: 将环境变量配置到 Vercel 或其他部署平台
2. **数据备份**: 定期备份 Supabase 数据库
3. **监控**: 设置 Supabase 监控和告警
4. **安全**: 配置适当的 RLS 策略

## 📞 支持

如果遇到问题：
1. 检查 Supabase Dashboard 的 Logs 部分
2. 查看浏览器控制台的错误信息
3. 确认所有环境变量都正确设置
