# 🚨 快速修复指南

## 问题：`column "merchant_id" does not exist`

### 🔧 解决方案

#### 步骤 1: 使用修复版本的SQL文件

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 复制 `supabase/migrations/supabase_schema_fixed.sql` 的内容
5. 粘贴并执行

#### 步骤 2: 验证安装

运行测试脚本来验证表是否正确创建：

1. 在 Supabase SQL Editor 中运行 `supabase/migrations/test_schema.sql`
2. 检查输出，确保所有表都已创建

#### 步骤 3: 检查环境变量

确保在 Vercel 中配置了正确的环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 🎯 推荐的文件

- **`supabase_schema_fixed.sql`** - 最新修复版本，推荐使用
- **`test_schema.sql`** - 用于验证数据库结构

### 🔍 故障排除

如果仍然遇到问题：

1. **清理现有表**：
   ```sql
   -- 在 supabase_schema_fixed.sql 中取消注释清理部分
   DROP TABLE IF EXISTS tickets CASCADE;
   DROP TABLE IF EXISTS orders CASCADE;
   DROP TABLE IF EXISTS prices CASCADE;
   DROP TABLE IF EXISTS events CASCADE;
   DROP TABLE IF EXISTS admin_invite_codes CASCADE;
   DROP TABLE IF EXISTS merchants CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```

2. **检查表结构**：
   ```sql
   \d users
   \d merchants
   \d events
   ```

3. **验证外键关系**：
   ```sql
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY';
   ```

### ✅ 验证成功标志

当您看到以下输出时，表示修复成功：

```
NOTICE:  PartyTix Supabase schema migration completed successfully!
NOTICE:  Tables created: users, merchants, admin_invite_codes, events, prices, orders, tickets
NOTICE:  All indexes and triggers applied successfully
NOTICE:  Seed data inserted: Ridiculous Chicken merchant
NOTICE:  Schema is ready for use!
```

### 📞 需要帮助？

如果问题仍然存在，请提供：
1. 完整的错误信息
2. 您使用的SQL文件版本
3. Supabase项目的配置信息
