# 🎫 PartyTix 完整功能总结

## 📊 系统概览

PartyTix 是一个基于 Next.js + Supabase + Stripe 的现代化活动票务管理系统，支持顾客购买票务、商家管理活动和订单、管理员监管整个平台。系统采用全英文界面，支持多种票务类型、年龄限制、组合票务等高级功能。

---

## 👤 一、顾客功能 (Customer Features)

### 1.1 用户认证系统

#### **用户注册** (`/auth/register`)
- 邮箱注册
- 密码强度验证
- 邮箱验证功能
- 自动登录

#### **用户登录** (`/auth/login`)
- 邮箱密码登录
- 记住登录状态
- 忘记密码功能
- 邮箱验证状态检查

#### **密码管理**
- 忘记密码 (`/auth/forgot-password`)
- 重置密码 (`/auth/reset-password`)
- 邮箱验证 (`/auth/verify-email`)

### 1.2 活动浏览与购买

#### **首页** (`/`)
- 浏览所有活动列表
- 活动卡片展示（海报、标题、描述、价格、地点、时间）
- 响应式布局
- 活动筛选和搜索

#### **活动详情页** (`/events/[id]`)
- **活动信息展示**:
  - 活动标题、描述、海报
  - 活动时间、地点、地址
  - 主办方信息
  - 票务有效期说明

- **票务分类展示**:
  - **Entry Tickets** (入场票):
    - Entry (18-20): 18-20岁入场票
    - Entry (21+): 21岁以上入场票
  - **Drink Tickets** (酒水票):
    - 21+ 限制购买
  - **Queue Pass** (插队票):
    - 快速通道票
  - **Combo Package** (组合套餐):
    - Entry + Drink 组合
    - 21+ 限制购买
    - 购买后自动生成入场票和酒水票两张票

- **购票流程**:
  - 选择票种和数量
  - 填写客户信息（姓名、邮箱、年龄）
  - 年龄验证（21+限制票种）
  - 查看总价
  - 显示"票务一旦售出无法退款"提示
  - 跳转 Stripe 支付

### 1.3 个人账户管理 (`/account`)

#### **账户首页**
- **用户信息卡片**:
  - 用户头像（显示姓名首字母）
  - 姓名和邮箱显示
  - "View My Profile" 按钮

- **快捷入口 (Shortcuts)**:
  - **My Tickets**: 我的票务（模态框显示）
  - **Order History**: 订单历史（模态框显示）
  - **Settings**: 设置（待开发）

- **登出功能**: 页面底部登出按钮

#### **我的票务 (My Tickets Modal)**
- **票务分类显示**:
  - Entry Tickets
  - Drink Tickets
  - Queue Pass
  - Other

- **票务状态管理**:
  - **Unused** (未使用): 默认展开
  - **Used** (已使用): 默认收起

- **票务信息展示**:
  - 活动标题（优先显示快照数据）
  - 票务编号
  - 票种类型
  - 活动日期和场地（优先显示快照数据）
  - 购买价格（快照数据）
  - 发行日期
  - 使用日期（如已使用）
  - 二维码显示

- **票务操作**:
  - 三击使用票务（防误操作）
  - 展开/收起票务详情
  - 查看二维码

#### **订单历史 (Order History Modal)**
- 订单列表展示
- 订单详情（订单号、日期、金额、状态）
- 关联票务信息

#### **个人资料编辑 (Profile Details Modal)**
- 查看和编辑个人信息
- 姓名、邮箱、年龄编辑
- 保存修改

### 1.4 票务快照功能

- **数据持久化**: 
  - 即使活动被删除或价格被修改，票务信息仍然完整保存
  - 活动快照字段: title, description, venue_name, address, start_at, end_at, poster_url
  - 价格快照字段: name, amount_cents, currency

### 1.5 QR 码扫描 (`/qr-scanner`)
- 扫码验证票务
- 手动输入票务代码
- 查看票务详情
- 票务有效期验证

---

## 🏪 二、商家功能 (Merchant Features)

### 2.1 商家认证

#### **商家注册** (`/merchant/auth/register`)
- 使用邀请码注册
- 邮箱密码注册
- 商家信息填写

#### **商家登录** (`/merchant/auth/login`)
- 邮箱密码登录
- 商家控制台访问

### 2.2 商家控制台 (`/merchant`)

#### **控制台首页**
- **今日统计**:
  - 今日售票数量
  - 今日验票数量
  - 今日收入统计
- **低库存提醒**: 自动提醒库存不足的票种
- **快速访问**: 活动管理、扫码验票等入口

### 2.3 活动管理 (`/merchant/events`)

#### **活动列表**
- 查看所有创建的活动
- 活动状态显示
- 快速编辑和删除

#### **创建活动** (`/merchant/events/new`)
- **基本信息**:
  - 活动标题、描述
  - 活动时间（开始/结束）
  - 场地名称和地址
  - 海报上传和预览

- **票种配置**:
  - 多个票种设置
  - 票种类型选择:
    - Entry (18-20)
    - Entry (21+)
    - Queue Pass
    - Drink Ticket
    - **Combo Package** (Entry + Drink, 21+ Only)
  - 价格设置（美元，以分为单位）
  - 库存数量
  - 限购数量（可选）

#### **编辑活动** (`/merchant/events/edit/[id]`)
- 修改活动信息
- 更新票种和价格
- 修改库存

### 2.4 扫码验票 (`/merchant/scan`)
- 摄像头扫码功能
- 手动输入票务代码
- 扫码历史记录
- 票务验证（有效/无效/已使用）
- 验票成功/失败提示

### 2.5 订单管理 (`/merchant/purchases`)
- 查看所有订单
- 订单详情
- 订单状态管理

---

## 👨‍💼 三、管理员功能 (Admin Features)

### 3.1 管理员认证

#### **管理员登录** (`/admin`)
- 密码验证登录
- 管理员面板访问

### 3.2 管理员面板 (`/admin/dashboard`)

#### **系统概览**
- **数据统计**:
  - 总用户数
  - 总商家数
  - 总活动数
  - 总订单数
  - 总票务数

#### **标签页管理**
- **Overview**: 系统统计概览
- **Merchants**: 商家列表和管理
- **Events**: 活动列表和管理
- **Invite Codes**: 邀请码生成和管理
- **Customers**: 客户列表
- **Tickets**: 票务列表

#### **功能操作**
- 生成商家邀请码
- 创建活动
- 编辑活动
- 删除活动
- 管理商家账户

### 3.3 系统数据 (`/admin/data`)
- 订单列表查看
- 票务列表查看
- 订单详情
- 票务详情

### 3.4 联系消息 (`/admin/contact-messages`)
- 查看用户留言
- 消息管理

### 3.5 邀请码管理 (`/admin/invite-codes`)
- 查看所有邀请码
- 生成新邀请码
- 邀请码状态管理（已使用/未使用）

### 3.6 扫码验票 (`/admin/scan`)
- 管理员扫码验证
- 票务验证功能

---

## 💳 四、支付系统 (Payment System)

### 4.1 Stripe 集成
- **支付流程**:
  1. 创建 Stripe Checkout Session
  2. 跳转到 Stripe 支付页面
  3. 支付成功后 Webhook 处理
  4. 自动创建订单和票务

### 4.2 Webhook 处理
- **订单创建**: 支付成功后自动创建订单
- **票务生成**: 
  - 普通票: 生成对应票种
  - Combo 票: 自动生成 Entry + Drink 两张票
- **快照保存**: 保存活动 and 价格快照数据

### 4.3 支付状态
- 支付成功页面 (`/success`)
- 支付失败处理
- 订单状态跟踪

---

## 🎫 五、票务系统核心功能

### 5.1 票务类型 (Ticket Types)

#### **Entry Tickets (入场票)**
- `entry_18_20`: 18-20岁入场票
- `entry_21_plus`: 21岁以上入场票

#### **Drink Tickets (酒水票)**
- `drink`: 酒水票
- 21+ 年龄限制

#### **Queue Pass (插队票)**
- `queue`: 快速通道票

#### **Combo Package (组合套餐)**
- `combo`: Entry + Drink 组合
- 21+ 限制购买
- 购买后自动生成两张票（Entry + Drink）

### 5.2 票务分类显示
- **Entry Tickets**: 包含 18-20 和 21+ 入场票
- **Drink Tickets**: 酒水票单独分类
- **Queue Pass**: 插队票单独分类
- **Other**: 其他类型票务

### 5.3 年龄限制验证
- 21+ 限制票种:
  - Entry (21+)
  - Drink Ticket
  - Combo Package
- 购买时自动验证年龄
- 不符合年龄要求无法购买

### 5.4 票务快照系统
- **活动快照字段**:
  - `event_title_snapshot`: 活动标题
  - `event_description_snapshot`: 活动描述
  - `event_venue_snapshot`: 场地名称
  - `event_address_snapshot`: 地址
  - `event_start_at_snapshot`: 开始时间
  - `event_end_at_snapshot`: 结束时间
  - `event_poster_url_snapshot`: 海报URL

- **价格快照字段**:
  - `price_name_snapshot`: 价格名称
  - `price_amount_cents_snapshot`: 价格（分）
  - `price_currency_snapshot`: 货币类型

- **数据持久化**: 即使活动删除或价格修改，票务信息完整保留

### 5.5 票务使用功能
- 三击防误操作机制
- 票务状态更新（未使用 → 已使用）
- 使用时间记录
- QR 码验证

---

## 🔧 六、技术架构

### 6.1 前端技术栈
- **框架**: Next.js 15.5.6
- **UI 库**: React 18
- **样式**: Tailwind CSS + 内联样式
- **状态管理**: React Hooks (useState, useEffect, useMemo)
- **路由**: Next.js App Router
- **二维码**: qrcode.react

### 6.2 后端技术栈
- **框架**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth + JWT
- **支付**: Stripe
- **语言**: Node.js

### 6.3 数据库结构
- **用户表** (users): 用户信息
- **商家表** (merchants): 商家信息
- **活动表** (events): 活动信息
- **价格表** (prices): 票种价格配置
  - `ticket_kind`: 票种类型字段
- **订单表** (orders): 订单信息
- **票务表** (tickets): 票务信息
  - 快照字段: event_*_snapshot, price_*_snapshot
- **邀请码表** (invite_codes): 商家邀请码

### 6.4 API 路由

#### **认证相关** (`/api/auth/`)
- `/api/auth/register`: 用户注册
- `/api/auth/login`: 用户登录
- `/api/auth/forgot-password`: 忘记密码
- `/api/auth/reset-password`: 重置密码
- `/api/auth/verify-email`: 邮箱验证
- `/api/auth/send-verification`: 发送验证邮件

#### **活动相关** (`/api/events/`)
- `/api/events`: 获取活动列表
- `/api/events/[id]`: 获取/更新/删除活动

#### **支付相关** (`/api/checkout_sessions`)
- 创建 Stripe Checkout Session

#### **订单相关** (`/api/orders/`)
- `/api/orders/by-session`: 根据 Session ID 获取订单

#### **票务相关** (`/api/tickets/`)
- `/api/tickets/info`: 获取票务信息
- `/api/tickets/verify`: 验证票务
- `/api/tickets/use`: 使用票务

#### **Webhook** (`/api/webhook`)
- Stripe Webhook 处理
- 订单和票务自动创建

#### **管理员相关** (`/api/admin/`)
- `/api/admin/stats`: 系统统计
- `/api/admin/merchants`: 商家管理
- `/api/admin/events`: 活动管理
- `/api/admin/invite-codes`: 邀请码管理
- `/api/admin/customers`: 客户管理
- `/api/admin/tickets`: 票务管理

---

## 🎨 七、UI/UX 特性

### 7.1 设计风格
- **渐变背景**: 紫蓝渐变 (linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%))
- **玻璃态效果**: 毛玻璃卡片 (rgba(15, 23, 42, 0.6))
- **响应式设计**: 支持桌面端和移动端
- **平滑过渡动画**: CSS transitions

### 7.2 用户体验
- **加载状态**: 骨架屏和加载动画
- **错误处理**: 友好的错误提示
- **表单验证**: 实时验证和错误提示
- **成功/失败提示**: 清晰的操作反馈
- **模态框**: 票务和订单详情模态框
- **折叠展开**: 票务分类和状态折叠展开

### 7.3 交互特性
- **三击防误操作**: 票务使用需要三击确认
- **默认展开/收起**: 
  - Unused 票务默认展开
  - Used 票务默认收起
- **快捷入口**: 账户页面快捷操作按钮

---

## 🔐 八、安全特性

### 8.1 认证和授权
- **用户认证**: Supabase Auth
- **邮箱验证**: 必须验证邮箱才能购买票务
- **JWT Token**: 安全的 token 管理
- **路由保护**: AuthGuard 组件保护需要登录的页面

### 8.2 数据安全
- **行级安全策略 (RLS)**: Supabase RLS 保护数据
- **环境变量**: 敏感信息存储在环境变量中
- **快照数据**: 票务信息快照确保数据完整性

### 8.3 支付安全
- **Stripe 安全支付**: 使用 Stripe 处理支付
- **Webhook 验证**: Stripe Webhook Secret 验证
- **支付状态跟踪**: 完整的支付流程跟踪

---

## 📱 九、功能流程

### 9.1 顾客购票流程
1. **注册/登录** → 创建账户或登录
2. **浏览活动** → 首页查看所有活动
3. **查看详情** → 点击活动卡片进入详情页
4. **选择票种** → 选择票种类型和数量
5. **填写信息** → 填写姓名、邮箱、年龄
6. **年龄验证** → 系统验证年龄是否符合要求（21+限制）
7. **确认购买** → 查看总价和退款提示
8. **支付** → 跳转 Stripe 支付页面
9. **支付完成** → 自动创建订单和票务
10. **查看票务** → 在账户页面查看我的票务

### 9.2 商家管理流程
1. **商家注册** → 使用邀请码注册
2. **登录** → 进入商家控制台
3. **创建活动** → 填写活动信息和配置票种
4. **设置票种** → 配置价格、库存、类型（包括 Combo）
5. **管理活动** → 查看、编辑、删除活动
6. **查看统计** → 查看售票和收入统计
7. **扫码验票** → 验证顾客票务

### 9.3 管理员管理流程
1. **管理员登录** → 输入密码登录
2. **查看概览** → 查看系统统计
3. **管理商家** → 查看商家列表和管理
4. **生成邀请码** → 为商家生成邀请码
5. **管理活动** → 查看、创建、编辑活动
6. **查看数据** → 查看订单和票务数据

---

## 📊 十、数据库迁移

### 10.1 已完成的迁移
- **票种类型字段**: `prices.ticket_kind` (entry_18_20, entry_21_plus, queue, drink, combo)
- **票务快照字段**: `tickets` 表中的 event_*_snapshot 和 price_*_snapshot 字段

### 10.2 迁移文件
- `supabase/migrations/add_ticket_kind_to_prices_FIXED.sql`
- `supabase/migrations/add_combo_to_ticket_kind.sql`
- `supabase/migrations/add_ticket_snapshot_fields.sql`

---

## ✅ 十一、核心特性总结

### 11.1 票务系统
- ✅ 多种票务类型支持（Entry, Drink, Queue, Combo）
- ✅ 票务分类展示（Entry Tickets, Drink Tickets, Queue Pass）
- ✅ 年龄限制验证（21+）
- ✅ Combo 票自动生成多张票
- ✅ 票务快照数据持久化
- ✅ 三击防误操作机制
- ✅ QR 码生成和验证

### 11.2 支付系统
- ✅ Stripe 支付集成
- ✅ Webhook 自动处理
- ✅ 订单自动创建
- ✅ 票务自动生成
- ✅ 支付状态跟踪

### 11.3 用户系统
- ✅ 用户注册/登录
- ✅ 邮箱验证
- ✅ 密码重置
- ✅ 个人账户管理
- ✅ 票务和订单查看

### 11.4 商家系统
- ✅ 商家注册（邀请码）
- ✅ 活动创建和管理
- ✅ 票种配置（包括 Combo）
- ✅ 扫码验票
- ✅ 数据统计

### 11.5 管理员系统
- ✅ 系统概览
- ✅ 商家管理
- ✅ 活动管理
- ✅ 邀请码管理
- ✅ 数据查看

---

## 🚀 十二、部署和运维

### 12.1 部署平台
- **前端**: Vercel
- **数据库**: Supabase
- **支付**: Stripe

### 12.2 版本管理
- Git 版本控制
- 分支策略 (main, develop, feature/*)
- 自动部署

### 12.3 环境变量
- Supabase 配置
- Stripe 配置
- 其他服务配置

---

## 📝 总结

PartyTix 是一个功能完整的现代化票务管理系统，具备以下核心能力：

1. **完整的用户系统**: 注册、登录、邮箱验证、密码管理
2. **丰富的票务类型**: Entry、Drink、Queue、Combo 等多种票种
3. **智能票务分类**: 自动分类展示，提升用户体验
4. **年龄限制验证**: 21+ 限制票种的自动验证
5. **Combo 票支持**: 自动生成多张票的组合套餐
6. **数据持久化**: 票务快照确保数据完整性
7. **安全支付**: Stripe 集成，安全的支付流程
8. **商家管理**: 完整的活动创建和管理功能
9. **管理员系统**: 全面的系统管理和监控
10. **响应式设计**: 支持桌面端和移动端

系统采用现代化的技术栈，具有良好的可扩展性和维护性。

---

*最后更新: 2024年12月*

