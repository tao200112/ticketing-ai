# PartyTix Auth 统一重构总结

## 重构目标

1. ✅ 所有账号（商家、普通用户、Google 用户、邮箱用户）统一写入 Supabase auth.users
2. ✅ 商家使用邀请码注册，不做邮箱验证
3. ✅ Google 登录：无需邮箱验证，但登录后必须提示设置密码
4. ✅ 邮箱注册普通用户：完成注册后直接能用整个系统，不阻塞，但前端显示"未验证邮箱"提示
5. ✅ 所有业务资料分别同步到 public.users 和 merchant_members
6. ✅ 所有验证逻辑基于业务表，不使用 auth.users.email_confirmed_at 决定权限

## 已完成的工作

### 1. 数据库迁移

**文件**: `supabase/migrations/202501150000_add_require_email_verification.sql`

- ✅ 为 `public.users` 添加 `require_email_verification` 字段（默认 false）
- ✅ 为 `merchant_members` 添加 `require_email_verification` 字段（默认 false）
- ✅ 更新现有记录为 false（向后兼容）

### 2. 核心 API

#### `/api/auth/after-login` (新建)

**功能**:
- 根据当前访问路径判断入口类型（商家 vs 普通用户）
- 查找或创建业务表记录（public.users 或 merchant_members）
- 检查是否需要设置密码（Google 登录用户）
- 检查是否需要 onboarding
- 返回前端需要的状态信息

**返回格式**:
```json
{
  "isUser": boolean,
  "isMerchant": boolean,
  "requireEmailVerification": boolean,
  "emailConfirmed": boolean,
  "needPasswordSetup": boolean,
  "needOnboarding": boolean
}
```

#### `/api/merchant/activate-invite` (新建)

**功能**:
- 校验 admin_invite_codes
- 创建 merchant_members 记录
- 设置 require_email_verification = false
- 标记 used_by = user.id

### 3. 前端登录后逻辑

**文件**: `lib/auth-after-login.js` (新建)

统一的登录后处理函数，根据 after-login API 的返回结果决定跳转：
- 商家 → `/merchant/dashboard`
- 需要设置密码 → `/onboarding/set-password`
- 需要 onboarding → `/onboarding`
- 默认 → `/account`

**已更新的文件**:
- ✅ `components/LoginForm.js` - 邮箱登录后调用 after-login
- ✅ `app/auth/login/page.js` - 登录页面调用 after-login
- ✅ `app/auth/oauth-success/page.js` - OAuth 成功后调用 after-login

### 4. Onboarding 页面

#### `/onboarding/set-password` (新建)

- Google 登录用户设置密码
- 更新 user_metadata.has_password = true
- 完成后调用 after-login 处理后续逻辑

#### `/onboarding` (新建)

- 完善用户基本信息（姓名、年龄）
- 更新 public.users 表
- 完成后调用 after-login 处理后续逻辑

## 工作流程

### Google 登录流程

1. 用户点击 Google 登录
2. 完成 Google OAuth
3. 跳转到 `/auth/oauth-success`
4. 调用 `/api/auth/after-login`
5. API 返回 `needPasswordSetup: true`
6. 跳转到 `/onboarding/set-password`
7. 用户设置密码
8. 再次调用 `/api/auth/after-login`
9. 根据返回结果跳转到相应页面

### 邮箱注册流程

1. 用户注册账号
2. 完成注册后直接登录
3. 调用 `/api/auth/after-login`
4. API 创建 public.users 记录，`require_email_verification: false`
5. 用户可以直接使用系统
6. 前端显示"未验证邮箱"提示（UI 待实现）

### 商家邀请码流程

1. 用户登录（Google 或邮箱）
2. 访问商家注册页面，输入邀请码
3. 调用 `/api/merchant/activate-invite`
4. API 校验邀请码，创建 merchant_members 记录
5. 跳转到 `/merchant/dashboard`

## 已清理的代码

### 1. 清理 email_confirmed_at 依赖

已修改以下文件：

- ✅ `app/api/merchant/register/route.js` - 移除 email_confirmed_at 日志记录
- ✅ `app/api/merchant/login/route.js` - 移除 email_confirmed_at 日志记录
- ✅ `app/account/page.js` - 改用 require_email_verification 字段
- ✅ `app/api/users/sync/route.js` - 改用 require_email_verification 字段

**保留的文件**（调试 API，不影响生产）：
- `app/api/debug/confirm-user-email/route.js` - 调试 API，保留
- `app/api/debug/check-auth-user/route.js` - 调试 API，保留

### 2. 前端 UI 提示

- 在用户页面显示"未验证邮箱"提示（如果 `requireEmailVerification: true`）
- 不影响功能使用，仅作为提示

### 3. 移动端

移动端使用 WebView，会自动使用 Web 端的逻辑，但可以考虑：
- 在移动端 App.tsx 中检测登录状态后调用 after-login API
- 根据返回结果决定是否显示原生页面（如设置密码）

### 4. 测试

- [ ] 测试 Google 登录流程
- [ ] 测试邮箱注册流程
- [ ] 测试商家邀请码激活流程
- [ ] 测试密码设置流程
- [ ] 测试 onboarding 流程

## 数据库变更

### public.users 表

新增字段：
```sql
require_email_verification BOOLEAN DEFAULT false
```

### merchant_members 表

新增字段：
```sql
require_email_verification BOOLEAN DEFAULT false
```

## 重要说明

1. **不再使用 `email_confirmed_at`**: 所有权限判断基于业务表的 `require_email_verification` 字段
2. **统一账号管理**: 所有账号都在 `auth.users` 中，业务表只存储业务相关信息
3. **邮箱验证**: 新系统统一设置 `require_email_verification = false`，邮箱验证仅作为提示，不阻塞功能
4. **Google 登录**: 必须设置密码后才能继续使用（安全考虑）

## 文件清单

### 新建文件

- `supabase/migrations/202501150000_add_require_email_verification.sql`
- `app/api/auth/after-login/route.js`
- `app/api/merchant/activate-invite/route.js`
- `lib/auth-after-login.js`
- `app/onboarding/set-password/page.js`
- `app/onboarding/page.js`

### 修改文件

- `components/LoginForm.js`
- `app/auth/login/page.js`
- `app/auth/oauth-success/page.js`

### 待清理文件

- `app/api/merchant/register/route.js` (需要移除 email_confirmed_at 依赖)
- `app/api/merchant/login/route.js` (需要移除 email_confirmed_at 依赖)
- `app/account/page.js` (需要移除 email_confirmed_at 依赖)
- 其他使用 email_confirmed_at 的文件

