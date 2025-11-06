# PartyTix 功能总结

## 📋 项目概述
PartyTix 是一个基于 Next.js 和 Supabase 的在线票务平台，支持活动创建、票务销售、订单管理和用户管理。

---

## 🎯 核心功能模块

### 1. 用户系统
- ✅ **用户注册/登录**
  - 邮箱验证
  - 密码重置
  - 用户角色管理（user, merchant, admin）

- ✅ **账号管理页面** (`/account`)
  - 个人信息显示
  - **My Tickets** 分类显示：
    - 未使用票务（Unused Tickets）
    - 已使用票务（Used Tickets）
    - 每个分类可折叠/展开
  - **Purchase History** 可折叠/展开
  - 票务QR码显示和验证状态

### 2. 商家系统
- ✅ **商家注册/登录**
  - 邀请码验证（一次性使用）
  - 商家信息管理
  - 最大创建活动数量限制（可编辑）

- ✅ **商家活动管理** (`/merchant/events`)
  - 活动列表展示
  - 活动数据统计（总票数、已售、收入）
  - 编辑按钮（跳转到编辑页面）
  - 删除功能
  - 渐变背景主题

- ✅ **活动创建页面** (`/merchant/events/new`)
  - 多步骤表单
  - 活动基本信息（标题、描述、时间、地点）
  - 票务类型设置（价格、库存）
  - 库存可选（留空表示无限）
  - 图片上传（海报URL）
  - 表单验证

- ✅ **活动编辑页面** (`/merchant/events/edit/[id]`)
  - 从API加载活动数据
  - 权限验证（仅活动创建者可编辑）
  - 表单预填充
  - 更新活动信息
  - 库存可选（无限库存支持）

### 3. 活动展示和购买
- ✅ **活动列表页面** (`/events`)
  - 所有已发布活动展示
  - 活动卡片设计
  - 响应式布局

- ✅ **活动详情页面** (`/events/[id]`)
  - 活动详细信息
  - 票务类型选择
  - 数量选择（1-10张）
  - Stripe支付集成
  - QR码生成

- ✅ **支付处理**
  - Stripe Checkout Session
  - 支付成功回调
  - 订单创建
  - 票务生成

### 4. Activity 功能（活动内容展示）
- ✅ **Activity 页面** (`/activity`)
  - 显示所有活跃的activities
  - 网格布局
  - 文本预览（前150字符）
  - "Read more" 链接
  - 点击卡片进入详情页

- ✅ **Activity 详情页** (`/activity/[id]`)
  - 完整图片显示
  - 完整文本内容
  - 发布日期
  - 返回按钮

- ✅ **主页 Featured Activity**
  - 显示前3个activities（按sort_order排序）
  - 文本预览（前150字符）
  - "Read more" 链接
  - Browse Activity 按钮

- ✅ **Activity 管理（管理员）**
  - Activity列表显示
  - 创建Activity（标题、图片、文字）
  - 编辑Activity
  - 删除Activity
  - 排序功能（上移/下移）
  - 状态管理（Active/Inactive）
  - 图片上传（本地文件上传 + URL输入）
  - 图片预览

### 5. 管理员系统
- ✅ **管理员登录** (`/admin/login`)
  - 管理员认证
  - Session管理

- ✅ **管理员仪表板** (`/admin/dashboard`)
  - 数据统计概览（用户、商家、活动、订单、票务）
  - **Merchants 管理**：
    - 商家列表显示
    - 搜索功能（名称、邮箱、电话）
    - 编辑最大活动数量（max_events）
    - 商家状态显示
  - **Events 管理**：
    - 活动列表显示
    - 搜索功能（标题、描述、地点、商家）
    - 编辑活动
    - 删除活动
    - 排序功能（上移/下移）
    - 查看活动详情
  - **Customers 管理**：
    - 客户列表显示
    - 搜索功能（名称、邮箱）
  - **Tickets 管理**：
    - 票务列表显示
    - 订单关联
  - **Invite Codes 管理**：
    - 邀请码列表
    - 生成新邀请码
    - 状态显示（Used/Unused）
    - 使用信息（使用人、使用时间）
  - **Activities 管理**：
    - Activity列表显示
    - 创建Activity（标题*、图片、文字*、状态）
    - 编辑Activity
    - 删除Activity
    - 排序功能（上移/下移）
    - 查看完整内容链接

### 6. 主页功能
- ✅ **Hero Section**
  - 欢迎信息
  - Browse Events 按钮
  - Register Account 按钮

- ✅ **Featured Events**
  - 显示前3个活动（按sort_order排序）
  - 活动卡片展示
  - Browse Events 按钮

- ✅ **Featured Activity**
  - 显示前3个activities（按sort_order排序）
  - 文本预览（前150字符）
  - Browse Activity 按钮

### 7. 导航系统
- ✅ **主导航栏** (`components/NavbarPartyTix`)
  - PartyTix Logo
  - Events 链接
  - **Activity 链接**（新增）
  - Contact Us 链接
  - Account 链接
  - 响应式设计（移动端菜单）

### 8. 数据库功能
- ✅ **数据库表结构**
  - users（用户表）
  - merchants（商家表，包含max_events字段）
  - admin_invite_codes（邀请码表，一次性使用）
  - events（活动表，包含sort_order字段）
  - prices（价格表，inventory可为null表示无限）
  - orders（订单表）
  - tickets（票务表）
  - **activities（活动内容表，包含title、image_url、text、is_active、sort_order字段）**

- ✅ **数据库迁移**
  - `fix_holder_info_from_email.sql` - 修复票务持有者信息
  - `allow_null_inventory.sql` - 允许库存为null（无限库存）
  - `update_merchant_max_events_default.sql` - 商家最大活动数默认值
  - `add_sort_order_to_events_and_activities.sql` - 添加排序字段
  - `create_activities_table.sql` - 创建activities表
  - `add_title_to_activities.sql` - 添加标题字段

### 9. API 路由

#### 公共API
- ✅ `GET /api/events` - 获取已发布活动（按sort_order排序，前3个）
- ✅ `GET /api/activities` - 获取活跃activities（按sort_order排序，前3个）

#### 管理员API
- ✅ `GET /api/admin/events` - 获取所有活动
- ✅ `POST /api/admin/events` - 创建活动
- ✅ `PUT /api/admin/events/[id]` - 更新活动
- ✅ `DELETE /api/admin/events/[id]` - 删除活动
- ✅ `POST /api/admin/events/[id]/reorder` - 调整活动排序
- ✅ `GET /api/admin/activities` - 获取所有activities
- ✅ `POST /api/admin/activities` - 创建activity
- ✅ `PUT /api/admin/activities/[id]` - 更新activity
- ✅ `DELETE /api/admin/activities/[id]` - 删除activity
- ✅ `POST /api/admin/activities/[id]/reorder` - 调整activity排序
- ✅ `POST /api/admin/upload` - 图片上传（Supabase Storage）
- ✅ `GET /api/admin/merchants` - 获取商家列表
- ✅ `PUT /api/admin/merchants/[id]` - 更新商家信息（max_events）
- ✅ `GET /api/admin/customers` - 获取客户列表
- ✅ `GET /api/admin/tickets` - 获取票务列表
- ✅ `GET /api/admin/invite-codes` - 获取邀请码列表
- ✅ `POST /api/admin/invite-codes` - 生成邀请码

#### 票务API
- ✅ `GET /api/orders/by-session` - 根据Stripe session获取订单
- ✅ `POST /api/checkout_sessions` - 创建Stripe支付会话

---

## 🎨 UI/UX 特性

### 设计风格
- ✅ **深色主题**
  - 渐变背景（紫色到深蓝）
  - 半透明卡片（玻璃态效果）
  - 白色/浅色文字
  - 紫色/青色渐变按钮

### 响应式设计
- ✅ 桌面端导航
- ✅ 移动端菜单
- ✅ 响应式网格布局
- ✅ 自适应卡片尺寸

### 交互体验
- ✅ 悬停效果（卡片提升、阴影变化）
- ✅ 加载状态（Skeleton loading）
- ✅ 错误提示
- ✅ 成功提示
- ✅ 折叠/展开动画

---

## 🔧 技术特性

### 数据管理
- ✅ Supabase 数据库集成
- ✅ RLS（Row Level Security）策略
- ✅ 数据库触发器（updated_at自动更新）
- ✅ 数据验证（前端和后端）

### 文件上传
- ✅ Supabase Storage 集成
- ✅ 图片上传（JPEG、PNG、GIF、WebP）
- ✅ 文件大小限制（5MB）
- ✅ 图片预览功能

### 排序功能
- ✅ sort_order 字段管理
- ✅ 上移/下移按钮
- ✅ 自动排序（前3个显示在主页）

### 搜索功能
- ✅ 商家搜索（名称、邮箱、电话）
- ✅ 活动搜索（标题、描述、地点、商家）
- ✅ 客户搜索（名称、邮箱）
- ✅ 客户端过滤

### 库存管理
- ✅ 可选库存（null表示无限）
- ✅ 库存验证（仅在有限库存时检查）
- ✅ 已售数量统计

### 支付集成
- ✅ Stripe Checkout
- ✅ Webhook处理
- ✅ 支付状态管理
- ✅ 订单创建和关联

---

## 📱 页面列表

### 公共页面
- ✅ `/` - 主页（Featured Events + Featured Activity）
- ✅ `/events` - 活动列表
- ✅ `/events/[id]` - 活动详情和购票
- ✅ `/activity` - Activity列表
- ✅ `/activity/[id]` - Activity详情
- ✅ `/account` - 用户账号页面
- ✅ `/contact` - 联系页面

### 商家页面
- ✅ `/merchant/auth/register` - 商家注册
- ✅ `/merchant/auth/login` - 商家登录
- ✅ `/merchant/events` - 商家活动列表
- ✅ `/merchant/events/new` - 创建活动
- ✅ `/merchant/events/edit/[id]` - 编辑活动
- ✅ `/merchant/scan` - QR码扫描验证

### 管理员页面
- ✅ `/admin/login` - 管理员登录
- ✅ `/admin/dashboard` - 管理员仪表板

---

## 🔐 安全特性

- ✅ 邀请码一次性使用（is_active设为false，used_by记录）
- ✅ 权限验证（商家只能编辑自己的活动）
- ✅ 管理员认证
- ✅ 数据验证（输入验证）
- ✅ RLS策略（数据库级别安全）

---

## 📊 数据统计

- ✅ 用户统计
- ✅ 商家统计
- ✅ 活动统计
- ✅ 订单统计
- ✅ 票务统计
- ✅ 活动销售数据（总票数、已售、收入）

---

## 🎯 特殊功能

### 排序和置顶
- ✅ Events和Activities都有sort_order字段
- ✅ 管理员可以调整排序（上移/下移）
- ✅ 主页显示前3个（按sort_order排序）

### 文本预览
- ✅ Activity文本自动截断（150字符）
- ✅ "Read more"链接跳转到详情页
- ✅ 详情页显示完整内容

### 图片管理
- ✅ 支持本地文件上传
- ✅ 支持URL输入
- ✅ 实时预览
- ✅ 上传状态提示
- ✅ 移除功能

### 状态管理
- ✅ Activity状态（Active/Inactive）
- ✅ 活动状态（Published/Draft）
- ✅ 票务状态（Unused/Used）
- ✅ 邀请码状态（Used/Unused）

---

## 📝 待运行数据库迁移

以下迁移文件需要在Supabase中运行：

1. ✅ `add_sort_order_to_events_and_activities.sql` - 添加排序字段（包含activities表创建）
2. ✅ `create_activities_storage_bucket.sql` - 创建图片存储bucket（可选，手动创建也可以）
3. ✅ `add_title_to_activities.sql` - 添加标题字段

---

## 🚀 部署信息

- ✅ Next.js 应用
- ✅ Vercel 部署（推测）
- ✅ Supabase 后端
- ✅ Stripe 支付集成

---

## 📈 功能统计

- **总页面数**: 15+
- **API路由数**: 20+
- **数据库表**: 7+
- **功能模块**: 8个主要模块

---

## ✨ 最新添加的功能

1. ✅ Activity功能（活动内容展示系统）
2. ✅ 主页Featured Activity和Events（各显示前3个）
3. ✅ 排序管理功能（上移/下移）
4. ✅ 图片上传功能（本地文件上传）
5. ✅ Activity标题字段
6. ✅ 文本预览和详情页
7. ✅ 管理员Activity管理界面

---

*最后更新: 2024年*

