# PartyTix 功能完整总结报告

## 📊 系统概览

PartyTix 是一个完整的活动票务管理系统，支持顾客购买票务、商家管理活动和订单、管理员监管整个平台。

---

## 👤 一、顾客功能 (Customer Features)

### 1.1 核心页面和组件

#### **首页 (`/`)**
- **文件**: `app/page.js`
- **功能**:
  - 浏览所有活动列表
  - 活动卡片展示（海报、标题、描述、价格、地点、时间）
  - 响应式布局
  - 搜索和筛选功能（如实现）

#### **活动详情页 (`/events/[id]`)**
- **功能**:
  - 查看活动详细信息
  - 选择票种（普通票、VIP票等）
  - 查看票价和库存
  - 购买票务

#### **用户认证**
- **登录页面** (`/auth/login`)
  - **文件**: `app/auth/login/page.js`
  - 功能: 用户登录、表单验证、错误处理
- **注册页面** (`/auth/register`)
  - **文件**: `app/auth/register/page.js`
  - 功能: 新用户注册、邮箱验证、密码验证

#### **账户管理** (`/account`)
- **文件**: `app/account/page.js`
- **功能**:
  - 查看个人信息
  - 我的订单列表
  - 我的票务列表
  - 查看票务详情
  - 注销登录

#### **QR 扫描器** (`/qr-scanner`)
- **文件**: `app/qr-scanner/page.js`
- **功能**:
  - 扫码验证票务
  - 手动输入票务代码
  - 查看票务详情
  - 票务有效期验证

### 1.2 数据存储

- **本地存储**:
  - `orders`: 订单数据
  - `tickets`: 票务数据
  - `userToken`: 用户认证令牌

### 1.3 主要组件

- **NavbarPartyTix**: 全局导航栏
- **EventCard**: 活动卡片展示
- **SkeletonCard**: 加载骨架屏
- **PriceSelector**: 价格选择器

---

## 🏪 二、商家功能 (Merchant Features)

### 2.1 核心页面和组件

#### **商家控制台首页** (`/merchant`)
- **文件**: `app/merchant/page.js`
- **功能**:
  - 今日售票统计
  - 今日验票统计
  - 今日收入统计
  - 低库存提醒
  - 快速访问入口

#### **活动管理** (`/merchant/events`)
- **文件**: `app/merchant/events/page.js`
- **功能**:
  - 查看所有活动
  - 活动列表展示
  - 编辑活动
  - 删除活动

#### **创建活动** (`/merchant/events/new`)
- **文件**: `app/merchant/events/new/page.js`
- **功能**:
  - 多步骤表单
  - 活动基本信息（标题、描述、时间、地点）
  - 海报上传和预览
  - 多个票种配置（名称、价格、库存、限购）
  - 表单验证

#### **编辑活动** (`/merchant/events/edit/[id]`)
- **功能**: 编辑现有活动

#### **扫码验票** (`/merchant/scan`)
- **文件**: `app/merchant/scan/page.js`
- **功能**:
  - 摄像头扫码
  - 手动输入票务代码
  - 扫码历史记录
  - 票务验证
  - 验票成功/失败提示

#### **商家认证**
- **登录** (`/merchant/auth/login`)
  - 商家登录
- **注册** (`/merchant/auth/register`)
  - 使用邀请码注册

### 2.2 数据存储

- **本地存储**:
  - `merchantEvents`: 商家创建的活动
  - `merchantUser`: 商家用户信息
  - `merchantToken`: 商家认证令牌

---

## 👨‍💼 三、管理员功能 (Admin Features)

### 3.1 核心页面和组件

#### **管理员登录** (`/admin`)
- **文件**: `app/admin/page.js`
- **功能**: 密码验证登录（密码: 1461）

#### **管理员面板** (`/admin/dashboard`)
- **文件**: `app/admin/dashboard/page.js`
- **功能**:
  - 系统概览
  - 数据统计（用户数、商家数、活动数、订单数、票务数）
  - 多个标签页:
    - Overview: 系统统计
    - Merchants: 商家列表
    - Events: 活动列表
    - Invite Codes: 邀请码管理
    - Customers: 客户列表
    - Tickets: 票务列表
  - 生成邀请码
  - 创建活动
  - 编辑活动
  - 删除活动

#### **系统数据** (`/admin/data`)
- **文件**: `app/admin/data/page.js`
- **功能**:
  - 订单列表
  - 票务列表
  - 订单详情
  - 票务详情

#### **联系消息** (`/admin/contact-messages`)
- **功能**: 查看用户留言

#### **邀请码管理** (`/admin/invite-codes`)
- **功能**:
  - 查看所有邀请码
  - 生成新邀请码
  - 邀请码状态管理

### 3.2 管理员 API 路由

所有管理员 API 位于 `app/api/admin/` 目录:

- **GET** `/api/admin/stats` - 系统统计
- **GET** `/api/admin/merchants` - 商家列表
- **GET** `/api/admin/events` - 活动列表
- **GET/POST** `/api/admin/invite-codes` - 邀请码管理
- **GET** `/api/admin/customers` - 客户列表
- **GET** `/api/admin/tickets` - 票务列表
- **GET** `/api/admin/orders` - 订单列表

---

## 🧩 四、共享组件 (Shared Components)

### 4.1 UI 组件

#### **NavbarPartyTix**
- **文件**: `components/NavbarPartyTix.js`
- **功能**: 
  - 全局导航栏
  - 响应式设计（桌面/移动端）
  - 菜单项: Events, QR Scanner, Merchant Console, Contact, Admin, Login, Register, Account

#### **EventCard**
- **文件**: `components/EventCard.js`
- **功能**: 活动卡片展示组件

#### **EventCreationForm**
- **文件**: `components/EventCreationForm.js`
- **功能**: 活动创建表单组件

#### **PriceSelector**
- **文件**: `components/PriceSelector.js`
- **功能**: 票种选择器组件

#### **GradientButton**
- **文件**: `components/GradientButton.js`
- **功能**: 渐变按钮组件

#### **SkeletonCard**
- **文件**: `components/SkeletonCard.js`
- **功能**: 加载骨架屏组件

### 4.2 认证组件

#### **AuthGuard**
- **文件**: `components/AuthGuard.js`
- **功能**: 路由保护组件

#### **ErrorBoundary**
- **文件**: `components/ErrorBoundary.tsx`
- **功能**: 错误边界处理

### 4.3 工具组件

#### **VersionDisplay**
- **文件**: `components/VersionDisplay.js`
- **功能**: 版本信息显示

---

## 🔧 五、技术架构

### 5.1 前端技术栈

- **框架**: Next.js 15.5.6
- **UI 库**: React 18
- **样式**: Tailwind CSS + 内联样式
- **状态管理**: React Hooks (useState, useEffect)
- **路由**: Next.js App Router

### 5.2 后端技术栈

- **框架**: Express.js
- **数据库**: Supabase (PostgreSQL)
- **认证**: JWT
- **支付**: Stripe
- **语言**: Node.js

### 5.3 数据存储

- **数据库**: Supabase
- **本地存储**: localStorage
- **数据同步**: API 调用

---

## 📱 六、功能流程

### 6.1 顾客流程

1. **浏览活动** → 首页查看所有活动
2. **查看详情** → 点击活动卡片进入详情页
3. **选择票种** → 选择票种和数量
4. **购买票务** → 跳转支付页面
5. **支付完成** → 生成票务和二维码
6. **查看票务** → 在账户页面查看我的票务

### 6.2 商家流程

1. **商家注册** → 使用邀请码注册
2. **登录** → 进入商家控制台
3. **创建活动** → 填写活动信息和票价
4. **管理活动** → 查看、编辑、删除活动
5. **查看统计** → 查看售票和收入统计
6. **扫码验票** → 验证顾客票务

### 6.3 管理员流程

1. **管理员登录** → 输入密码登录
2. **查看概览** → 查看系统统计
3. **管理商家** → 查看商家列表和管理
4. **管理活动** → 查看、创建、编辑活动
5. **生成邀请码** → 为商家生成邀请码
6. **查看数据** → 查看订单和票务数据

---

## 🔐 七、认证和权限

### 7.1 认证方式

- **顾客**: 邮箱密码登录/注册
- **商家**: 邮箱密码登录，邀请码注册
- **管理员**: 密码登录（密码: 1461）

### 7.2 数据存储

- **顾客**: `userToken`, `user`
- **商家**: `merchantToken`, `merchantUser`
- **管理员**: `adminToken`, `adminUser`

---

## 🎨 八、UI/UX 特性

### 8.1 设计风格

- 渐变背景（紫蓝渐变）
- 玻璃态效果（毛玻璃卡片）
- 响应式设计
- 平滑过渡动画

### 8.2 用户体验

- 加载状态提示
- 错误处理
- 表单验证
- 成功/失败提示

---

## 📊 九、数据流

### 9.1 数据来源

1. **Supabase**: 主要数据存储
2. **localStorage**: 临时数据和缓存
3. **API**: 后端数据处理

### 9.2 数据同步

- 前端通过 API 调用后端
- 后端连接 Supabase 数据库
- 实时数据更新（如订单状态）

---

## ✅ 十、已知问题和待修复功能

### 10.1 Navbar 组件错误
- **问题**: 事件处理器错误
- **状态**: 已修复

### 10.2 管理员 API 缺失
- **问题**: API 路由 404
- **状态**: 已修复

### 10.3 数据库连接
- **问题**: 需要验证 Supabase 连接
- **状态**: 待处理

### 10.4 RLS 策略
- **问题**: 可能需要配置 RLS
- **状态**: 待处理

---

## 📝 总结

PartyTix 是一个功能完整的票务系统，支持:
- ✅ 顾客购买和管理票务
- ✅ 商家创建和管理活动
- ✅ 管理员监管整个平台
- ✅ 扫码验票功能
- ✅ 支付集成（Stripe）
- ✅ 响应式设计

当前主要问题集中在数据库配置和 API 连接，建议优先修复这些基础功能，然后再进行其他优化。


