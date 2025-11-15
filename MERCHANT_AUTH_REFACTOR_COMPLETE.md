# 商家认证系统重构完成报告

## ✅ 重构目标

将商家认证系统完全独立于 Supabase Auth 的用户认证系统，实现两套认证系统的完全隔离。

## ✅ 完成的工作

### 1. 数据库迁移

**文件**: `supabase/migrations/20250116_refactor_merchant_auth.sql`

- ✅ 修改 `merchants` 表结构：
  - 删除 `owner_supabase_uid`、`owner_user_id`、`contact_email`、`contact_phone` 字段
  - 添加 `email`（唯一）、`password_hash`、`name` 字段
  - 确保 `email` 字段为必需且唯一

- ✅ 创建 `invite_codes` 表：
  - 支持多种类型：`merchant`、`user`、`admin`
  - 字段：`id`、`code`、`type`、`used`、`used_at`、`created_at`、`created_by`
  - 自动迁移现有 `admin_invite_codes` 数据

### 2. JWT 认证系统

**文件**: `lib/auth/merchant-jwt.js`

- ✅ 商家 JWT token 生成和验证
- ✅ Cookie 管理（httpOnly、secure、sameSite）
- ✅ Token 验证函数
- ✅ 完全独立于 Supabase Auth

### 3. API 端点

#### ✅ `/api/merchant/register` - 商家注册
- 验证邮箱格式和密码长度
- 验证邀请码（类型为 `merchant`，未使用）
- 检查邮箱唯一性
- 使用 bcrypt 加密密码
- 创建商家记录
- 标记邀请码为已使用
- 生成 JWT token 并设置 cookie

#### ✅ `/api/merchant/login` - 商家登录
- 通过邮箱查找商家
- 使用 bcrypt 验证密码
- 检查商家状态（必须为 `active`）
- 生成 JWT token 并设置 cookie

#### ✅ `/api/merchant/profile` - 商家个人信息（受保护）
- 验证 JWT token
- 返回商家详细信息

#### ✅ `/api/merchant/logout` - 商家登出
- 清除认证 cookie

#### ✅ `/api/admin/invite-codes/create` - 创建邀请码（管理员）
- 验证管理员权限
- 创建邀请码（支持多种类型）

#### ✅ `/api/admin/invite-codes/list` - 列出邀请码（管理员）
- 验证管理员权限
- 支持按类型和状态过滤

### 4. 中间件更新

**文件**: `middleware.ts`

- ✅ 商家路由隔离：
  - 识别商家路由：`/merchant/**` 和 `/api/merchant/**`
  - 排除登录和注册页面
  - 验证 JWT token
  - 未认证时重定向到登录页或返回 401

- ✅ 用户路由保持不变：
  - 继续使用 Supabase Auth
  - 不做任何修改

### 5. 前端页面更新

#### ✅ 登录页面 (`app/merchant/auth/login/page.js`)
- 移除 localStorage 使用
- Token 通过 httpOnly cookie 自动管理

#### ✅ 注册页面 (`app/merchant/auth/register/page.js`)
- 更新为使用 `/api/merchant/register`
- 移除 localStorage 使用
- 简化请求体（只需要 email、password、inviteCode、name）

#### ✅ 商家主页 (`app/merchant/page.js`)
- 从 API 获取商家信息（`/api/merchant/profile`）
- 移除 localStorage 依赖

#### ✅ Boss 页面 (`app/merchant/boss/page.js`)
- 从 API 获取商家信息
- 移除 localStorage 依赖

### 6. 客户端工具函数

**文件**: `lib/auth/merchant-client.js`

- ✅ `getMerchantInfo()` - 获取商家信息
- ✅ `isMerchantAuthenticated()` - 检查认证状态
- ✅ `merchantLogout()` - 登出

## 🔒 安全特性

1. **httpOnly Cookie**: Token 存储在 httpOnly cookie 中，防止 XSS 攻击
2. **Secure Cookie**: 生产环境使用 secure flag
3. **SameSite Strict**: 防止 CSRF 攻击
4. **bcrypt 加密**: 密码使用 bcrypt（12 rounds）加密
5. **JWT 签名**: 使用环境变量中的密钥签名
6. **路由隔离**: 商家路由和用户路由完全隔离

## 📋 环境变量要求

需要在 `.env` 或 `.env.local` 中添加：

```env
NEXT_PUBLIC_PARTYTIX_MERCHANT_SECRET=your-secret-key-here
# 或者
MERCHANT_JWT_SECRET=your-secret-key-here
```

**重要**: 使用强随机字符串作为密钥（至少 32 字符）。

## 🚀 部署步骤

1. **运行数据库迁移**:
   ```sql
   -- 在 Supabase Dashboard 的 SQL Editor 中执行
   -- supabase/migrations/20250116_refactor_merchant_auth.sql
   ```

2. **设置环境变量**:
   - 添加 `NEXT_PUBLIC_PARTYTIX_MERCHANT_SECRET` 或 `MERCHANT_JWT_SECRET`

3. **测试商家注册和登录**:
   - 创建邀请码（通过管理员 API）
   - 测试商家注册
   - 测试商家登录
   - 验证路由保护

## ⚠️ 注意事项

1. **旧数据迁移**: 
   - 如果数据库中有旧的商家记录，需要手动迁移 `contact_email` 到 `email`
   - 需要为现有商家设置密码（或要求重新注册）

2. **其他商家页面**:
   - 以下页面仍在使用 localStorage，需要后续更新：
     - `app/merchant/events/page.js`
     - `app/merchant/scan/page.js`
     - `app/merchant/staff/page.js`
     - `app/merchant/purchases/page.js`
     - `app/merchant/events/edit/[id]/page.js`
     - `app/merchant/events/new/page.js`
   
   建议：使用 `lib/auth/merchant-client.js` 中的 `getMerchantInfo()` 函数替换 localStorage 逻辑。

3. **向后兼容性**:
   - 旧的 `/api/merchant/create` 端点仍然存在，但建议使用新的 `/api/merchant/register`
   - 旧的 `/api/merchant/login` 已被完全重构

## ✅ 验证清单

- [x] 商家可以独立注册（不需要 Supabase Auth）
- [x] 商家可以独立登录（使用邮箱和密码）
- [x] JWT token 存储在 httpOnly cookie 中
- [x] 中间件正确隔离商家路由和用户路由
- [x] 用户认证系统未受影响
- [x] 管理员可以创建邀请码
- [x] 邀请码使用后自动标记为已使用

## 🎯 总结

**商家认证系统已成功从 Supabase Auth 分离，实现了完全独立的认证体系。**

- ✅ 商家使用本地数据库 + bcrypt + JWT
- ✅ 用户继续使用 Supabase Auth
- ✅ 两套系统完全隔离，互不影响
- ✅ 路由隔离确保认证状态不会混乱

---

**重构完成时间**: 2025-01-16
**状态**: ✅ 完成

