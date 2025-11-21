# Vercel环境变量配置指南

## 🚨 问题诊断
- 商户注册失败：环境变量未配置
- 管理员页面无法显示客户信息：数据库连接问题
- 所有数据存储功能失效：Supabase未配置

## 🛠️ 解决方案

### 步骤1：配置Supabase环境变量

#### 1.1 获取Supabase配置
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目或创建新项目
3. 进入 Settings > API
4. 复制以下信息：
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)

#### 1.2 在Vercel中设置环境变量
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 `ticketing-ai`
3. 进入 Settings > Environment Variables
4. 添加以下变量：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 邀请码配置（临时方案）
ADMIN_INVITE_CODES=[{"id":"invite_1761335678461","code":"INV_MH59SBGD_D20Z7C","isActive":true,"maxEvents":10,"usedBy":null,"usedAt":null,"expiresAt":"2025-11-23T19:54:38.461Z","createdAt":"2025-10-24T19:54:38.461Z"}]
```

### 步骤2：设置Supabase数据库

#### 2.1 运行数据库迁移
1. 在Supabase Dashboard中进入 SQL Editor
2. 复制 `supabase/migrations/fix_existing_schema.sql` 的内容
3. 粘贴并执行

#### 2.2 验证表结构
执行以下查询验证表是否创建成功：
```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'merchants', 'admin_invite_codes', 'events', 'orders', 'tickets');
```

### 步骤3：重新部署应用

```bash
npx vercel --prod --yes
```

### 步骤4：测试功能

#### 4.1 测试商户注册
- 访问：https://your-app.vercel.app/merchant/auth/register
- 使用邀请码：`INV_MH59SBGD_D20Z7C`

#### 4.2 测试管理员功能
- 访问：https://your-app.vercel.app/admin/login
- 登录：admin@partytix.com / admin123
- 检查客户信息是否显示

## 🔧 故障排除

### 如果仍然失败：

#### 1. 检查环境变量
```bash
# 在Vercel中验证环境变量是否正确设置
# 确保所有环境（Production, Preview, Development）都设置了变量
```

#### 2. 检查Supabase连接
```bash
# 在Supabase Dashboard > Settings > Database 中检查连接状态
# 确保数据库服务正在运行
```

#### 3. 检查RLS策略
```sql
-- 如果启用了RLS，可能需要调整策略
-- 在Supabase Dashboard > Authentication > Policies 中检查
```

## 📊 验证清单

- [ ] Supabase项目已创建
- [ ] 环境变量已设置
- [ ] 数据库迁移已执行
- [ ] 应用已重新部署
- [ ] 商户注册功能正常
- [ ] 管理员页面显示客户信息
- [ ] 所有数据操作正常

## 🆘 紧急修复

如果急需修复，可以使用临时方案：

### 临时环境变量配置
```bash
# 仅设置邀请码，使用本地存储
ADMIN_INVITE_CODES=[{"id":"invite_1761335678461","code":"INV_MH59SBGD_D20Z7C","isActive":true,"maxEvents":10,"usedBy":null,"usedAt":null,"expiresAt":"2025-11-23T19:54:38.461Z","createdAt":"2025-10-24T19:54:38.461Z"}]
```

这将启用基本的商户注册功能，但数据将存储在本地而不是数据库中。

## 📞 支持

如果问题持续存在：
1. 检查Vercel部署日志
2. 检查Supabase连接状态
3. 验证环境变量是否正确设置
4. 确认数据库迁移是否成功执行
