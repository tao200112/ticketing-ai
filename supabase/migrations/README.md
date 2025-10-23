# PartyTix MVP Database Migration

## 概述

这个迁移文件创建了 PartyTix MVP 的完整数据库模式，包括用户、商家、活动和价格表。所有 SQL 语句都是幂等的，可以安全地重复执行。

## 运行方式

### 1. 本地 SQL (推荐用于开发)

```bash
# 使用 psql 连接到数据库
psql -d your_database_name -f supabase/migrations/partytix_mvp.sql

# 或者如果使用 Supabase CLI
supabase db reset
supabase db push
```

### 2. Supabase SQL Editor (推荐用于生产)

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 导航到 SQL Editor
4. 复制 `partytix_mvp.sql` 的内容
5. 粘贴到 SQL Editor 中
6. 点击 "Run" 执行

### 3. Supabase CLI (推荐用于版本控制)

```bash
# 将迁移文件放在 supabase/migrations/ 目录下
supabase migration up

# 或者直接应用
supabase db push
```

## 创建的表

### 1. `users` - 用户表
- 存储用户基本信息
- 包含邮箱、姓名、年龄、角色
- 支持用户、商家、管理员角色

### 2. `merchants` - 商家表
- 存储商家信息
- 关联到用户表
- 包含验证状态和商家详情

### 3. `events` - 活动表
- 存储活动信息
- 关联到商家表
- 包含时间、地点、状态等信息

### 4. `prices` - 价格表
- 存储票档和价格信息
- 关联到活动表
- 支持库存管理和限购设置

## 安全特性

### Row Level Security (RLS)
- RLS 策略已注释，可根据需要启用
- 支持公开读取已发布内容
- 商家只能管理自己的数据

### 数据完整性
- 外键约束确保数据一致性
- 检查约束验证数据有效性
- 触发器自动更新时间戳

## 种子数据

迁移会自动插入 `Ridiculous Chicken` 商家作为种子数据，仅当不存在时插入。

## 视图

### `events_overview`
提供活动概览信息，包括商家信息、价格统计等。

### `merchant_stats`
提供商家统计数据，包括活动数量、参与人数、收入等。

## 注意事项

1. **幂等性**: 所有 SQL 语句都可以安全地重复执行
2. **RLS 策略**: 默认注释，需要手动启用
3. **外键关系**: 确保删除操作的正确级联
4. **索引**: 已创建必要的索引以优化查询性能

## 后续步骤

1. 根据需要启用 RLS 策略
2. 创建 orders 和 tickets 表（避免影响现有支付流程）
3. 设置适当的权限和角色
4. 配置备份和监控

## 故障排除

如果遇到错误：
1. 检查数据库连接
2. 确认权限设置
3. 查看 Supabase 日志
4. 验证表是否已存在

## 联系支持

如有问题，请查看 Supabase 文档或联系技术支持。
