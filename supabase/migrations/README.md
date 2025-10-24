# Supabase 数据库迁移文件

## 📁 文件说明

### 1. `partytix_mvp.sql`
- **完整版本**：包含所有表、触发器、约束和视图
- **适用场景**：本地开发或需要完整功能的部署
- **特点**：包含复杂的约束检查和视图

### 2. `supabase_schema.sql` ⭐ **推荐**
- **简化版本**：专门为 Supabase 优化
- **适用场景**：Supabase 部署
- **特点**：移除了可能导致问题的复杂约束，保留核心功能

### 3. `supabase_schema_fixed.sql` 🔥 **最新推荐**
- **修复版本**：修复了所有已知问题
- **适用场景**：Supabase 部署（推荐使用此版本）
- **特点**：移除了视图和复杂约束，确保稳定运行

## 🚀 使用方法

### 在 Supabase 中使用（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 复制 `supabase_schema_fixed.sql` 的内容（推荐使用此版本）
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行

### 在本地 PostgreSQL 中使用

```bash
# 使用完整版本
psql -d your_database -f supabase/migrations/partytix_mvp.sql

# 或使用简化版本
psql -d your_database -f supabase/migrations/supabase_schema.sql
```

## 📊 数据库表结构

### 核心表
- **users**: 用户表（包含密码哈希）
- **merchants**: 商家表
- **admin_invite_codes**: 管理员邀请码表
- **events**: 活动表
- **prices**: 价格表
- **orders**: 订单表
- **tickets**: 票据表

### 关系
- 用户 → 商家（一对多）
- 商家 → 活动（一对多）
- 活动 → 价格（一对多）
- 订单 → 票据（一对多）
- 活动 → 票据（一对多）

## 🔧 功能特性

### ✅ 已实现
- 用户认证和管理
- 商家注册和管理
- 邀请码系统
- 活动创建和管理
- 价格管理
- 订单处理
- 票据生成和验证
- 自动更新时间戳
- 完整的索引优化

### 🔒 安全特性
- 数据完整性约束
- 外键关系
- 检查约束
- 唯一性约束

## 🚨 注意事项

1. **环境变量**：确保在 Vercel 中配置了正确的 Supabase 环境变量
2. **RLS策略**：当前版本注释了 RLS 策略，如需要请取消注释
3. **种子数据**：会自动插入 Ridiculous Chicken 商家数据
4. **索引**：所有表都创建了必要的索引以优化查询性能

## 🔍 故障排除

### 常见问题

1. **表已存在错误**
   - 解决方案：使用 `IF NOT EXISTS` 语句，可以安全地重新运行

2. **权限错误**
   - 解决方案：确保数据库用户有创建表和索引的权限

3. **外键约束错误**
   - 解决方案：确保引用的表已经存在

### 验证安装

运行以下查询来验证表是否创建成功：

```sql
-- 检查所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 检查邀请码表
SELECT * FROM admin_invite_codes LIMIT 5;

-- 检查商家表
SELECT * FROM merchants LIMIT 5;
```

## 📞 获取帮助

如果遇到问题：
1. 检查 Supabase 项目的 API 设置
2. 验证环境变量配置
3. 查看 Supabase 日志
4. 确认网络连接正常