# 🔄 Supabase数据库重置指南

## 🚨 问题诊断

经过八轮修改，活动页面仍然无法进入，二维码生成失败，可能的原因：

1. **Supabase缓存问题** - 数据库结构不一致
2. **表结构不匹配** - 代码查询与数据库结构不符
3. **RLS策略问题** - 行级安全阻止数据访问
4. **环境变量问题** - Supabase连接配置错误

## 🛠️ 解决方案

### 步骤1: 清理Supabase缓存

1. **登录Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **清理缓存**
   - 进入 Settings > Database
   - 点击 "Reset Database" 或 "Clear Cache"
   - 等待清理完成

### 步骤2: 重新创建数据库结构

1. **打开SQL Editor**
   - 在Supabase Dashboard中，点击左侧菜单的 "SQL Editor"

2. **执行重置脚本**
   - 复制 `scripts/reset-supabase-database.sql` 的内容
   - 粘贴到SQL Editor中
   - 点击 "Run" 执行

3. **验证表结构**
   - 检查 Table Editor 中是否出现以下表：
     - `users`
     - `merchants` 
     - `events`
     - `prices`
     - `orders`
     - `tickets`
     - `admin_invite_codes`

### 步骤3: 检查环境变量

确保以下环境变量在Vercel中正确设置：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 步骤4: 测试数据库连接

访问以下页面测试连接：

1. **`/debug-supabase-config`** - 检查Supabase配置
2. **`/debug-db-status`** - 检查数据库状态
3. **`/debug-production`** - 检查生产环境

### 步骤5: 测试功能

1. **用户注册/登录**
   - 测试用户注册功能
   - 测试用户登录功能

2. **活动页面**
   - 访问 `/events/ridiculous-chicken`
   - 检查是否显示活动详情
   - 检查价格信息是否正确

3. **二维码生成**
   - 完成一次购买流程
   - 检查成功页面是否显示二维码
   - 检查二维码是否正常生成

## 🔍 故障排除

### 如果活动页面仍然无法进入：

1. **检查API路由**
   ```bash
   # 测试事件API
   curl https://your-domain.vercel.app/api/events
   ```

2. **检查数据库查询**
   - 查看Vercel函数日志
   - 检查是否有SQL错误

3. **检查RLS策略**
   - 确保RLS策略允许数据访问
   - 检查是否有权限问题

### 如果二维码仍然无法生成：

1. **检查qrcode库**
   - 确保 `qrcode` 库已安装
   - 检查是否有构建错误

2. **检查数据传递**
   - 确保购买数据正确传递到成功页面
   - 检查localStorage数据

3. **检查环境变量**
   - 确保所有必需的环境变量已设置
   - 检查Stripe配置

## 📋 检查清单

- [ ] Supabase缓存已清理
- [ ] 数据库结构已重建
- [ ] 环境变量已正确设置
- [ ] 用户注册/登录功能正常
- [ ] 活动页面可以正常访问
- [ ] 二维码可以正常生成
- [ ] 购买流程完整
- [ ] 数据正确保存到Supabase

## 🚀 预期结果

重置完成后，应该实现：

1. **完全线上部署** - 所有数据存储在Supabase中
2. **无本地存储依赖** - 移除所有localStorage使用
3. **稳定的活动页面** - 可以正常访问和显示
4. **正常的二维码生成** - 购买后可以生成二维码
5. **完整的数据流** - 从注册到购买到票据生成

## 📞 如果问题仍然存在

如果按照以上步骤操作后问题仍然存在，请：

1. 访问 `/debug-supabase-config` 查看详细诊断
2. 检查Vercel函数日志
3. 确认Supabase项目状态
4. 验证所有环境变量设置
