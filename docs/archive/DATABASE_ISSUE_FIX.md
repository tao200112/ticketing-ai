# 🗄️ 数据库问题修复指南

## 问题分析

根据用户反馈：
1. **创建的活动无法被正常打开** - 数据没有保存到数据库
2. **买票数据没有同步到个人账户** - 数据库连接失败
3. **二维码无法正常生成** - 缺少必要的票券数据

**根本原因**: 数据库连接问题，`supabaseAdmin` 在线上环境为 `null`

## 问题诊断

### 1. 检查环境变量

在Vercel Dashboard中确认以下环境变量已设置：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. 检查数据库连接

访问 `/debug-database` 页面进行诊断：
- 环境变量检查
- API端点测试
- 数据库操作测试

### 3. 检查Supabase配置

在 `lib/supabase-admin.ts` 中：
```typescript
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null  // 如果为null，说明环境变量未设置
```

## 修复步骤

### 步骤1: 检查Vercel环境变量

1. 登录Vercel Dashboard
2. 进入项目设置
3. 检查Environment Variables部分
4. 确认以下变量已设置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 步骤2: 检查Supabase项目

1. 登录Supabase Dashboard
2. 检查项目状态
3. 确认数据库连接正常
4. 检查表结构是否存在

### 步骤3: 检查数据库表

确认以下表存在：
- `events` - 存储活动信息
- `event_prices` - 存储票种信息
- `user_tickets` - 存储用户票券

### 步骤4: 检查RLS策略

确认Row Level Security策略允许：
- 读取活动数据
- 创建新活动
- 更新用户票券

## 常见问题解决

### 问题1: 环境变量未设置
**症状**: `supabaseAdmin` 为 `null`
**解决**: 在Vercel Dashboard中设置环境变量

### 问题2: 数据库连接失败
**症状**: API返回500错误
**解决**: 检查Supabase项目状态和连接

### 问题3: RLS策略阻止访问
**症状**: 数据库查询被拒绝
**解决**: 检查并更新RLS策略

### 问题4: 表不存在
**症状**: 查询返回表不存在的错误
**解决**: 创建必要的数据库表

## 紧急修复

如果问题持续存在：

1. **重新部署**: 在Vercel Dashboard中触发重新部署
2. **检查构建日志**: 查看是否有环境变量注入错误
3. **回滚版本**: 使用之前的稳定版本
4. **联系支持**: 提供详细的错误日志

## 调试工具

访问以下页面进行问题诊断：

- `/debug-database` - 数据库连接诊断
- `/debug-production` - 完整环境诊断
- `/fix-production-issues` - 自动修复工具

## 验证修复

修复后，验证以下功能：

1. **创建活动**: 能够成功创建并保存活动
2. **查看活动**: 能够正常打开创建的活动
3. **购买票券**: 能够成功购买并保存票券信息
4. **生成二维码**: 能够正常生成票券二维码
5. **个人账户**: 能够查看购买的票券

## 联系支持

如果问题仍然存在，请提供：
1. Vercel环境变量配置截图
2. Supabase项目状态
3. 数据库表结构
4. 错误日志详情
