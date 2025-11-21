# 🔐 PartyTix 账号注册和验证逻辑总结

## 📊 系统概览

PartyTix 使用基于 Supabase 的自定义认证系统，支持用户注册、邮箱验证、登录和密码重置功能。系统支持多角色（user, merchant, admin），并实现了完整的邮箱验证流程。

---

## 一、用户注册流程

### 1.1 前端注册页面 (`/auth/register`)

**文件**: `app/auth/register/page.js`

**功能特性**:
- 表单字段：
  - Email Address（必填）
  - Full Name（必填，至少2个字符）
  - Age（必填，16-120岁）
  - Password（必填，至少8个字符）
  - Confirm Password（必填，需与密码匹配）

**验证规则**:
- 邮箱格式验证：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 姓名长度：至少2个字符
- 年龄范围：16-120岁
- 密码长度：8-128个字符
- 密码确认：必须与密码匹配

**注册流程**:
1. 用户填写表单并提交
2. 前端验证表单数据
3. 调用 `/api/auth/register` API
4. 注册成功后：
   - 保存用户会话到 `localStorage` (`userSession`)
   - 自动调用 `/api/auth/send-verification` 发送验证邮件
   - 3秒后跳转到账户页面
   - 显示提示信息要求用户验证邮箱

### 1.2 后端注册 API (`/api/auth/register`)

**文件**: `app/api/auth/register/route.js`

**核心逻辑**:

#### **输入验证**
```javascript
- 必填字段：email, password, name
- 邮箱格式验证
- 密码长度：8-128字符
- 年龄验证：16-150岁（如果提供）
- 角色验证：user, merchant, admin
```

#### **角色检测**
- 支持从域名自动检测角色（通过 `getPortalFromHostname` 和 `getRoleFromPortal`）
- 允许同一邮箱注册不同角色（email + role 唯一性）

#### **用户存在性检查**
```javascript
// 检查同一邮箱和角色是否已存在
SELECT id FROM users 
WHERE email = ? AND role = ?
```

#### **密码加密**
- 使用 `bcrypt` 加密
- Salt rounds: 12
- 存储为 `password_hash`

#### **用户创建**
```javascript
INSERT INTO users (
  email,
  password_hash,
  name,
  age,
  role,
  email_verified_at,  // 初始为 null（未验证）
  registration_domain
)
```

#### **邮箱验证设置**
- 尝试调用 Supabase RPC `send_verification_email` 生成验证令牌
- 尝试发送验证邮件（不阻塞注册流程）
- 如果邮件发送失败，仅记录警告，不影响注册

#### **返回数据**
```javascript
{
  success: true,
  message: "Registration successful! Please check your email...",
  data: {
    id, email, name, age, role,
    emailVerified: false,
    needsVerification: true,
    requiresEmailVerification: true
  },
  requiresEmailVerification: true
}
```

---

## 二、邮箱验证流程

### 2.1 数据库字段

**users 表相关字段**:
- `email_verified_at`: TIMESTAMPTZ - 邮箱验证时间戳（null 表示未验证）
- `email_verification_token`: TEXT - 验证令牌
- `email_verification_expire_at`: TIMESTAMPTZ - 令牌过期时间（通常24小时）

### 2.2 发送验证邮件 (`/api/auth/send-verification`)

**文件**: `app/api/auth/send-verification/route.js`

**功能特性**:

#### **限流保护**
- IP 限流：15分钟内最多3次请求
- 邮箱限流：15分钟内最多2次请求
- 冷却期检查：如果令牌未过期，不允许重复发送

#### **验证逻辑**
1. 验证邮箱格式
2. 查找用户
3. 检查邮箱是否已验证（如果已验证，返回错误）
4. 检查冷却期（如果令牌未过期，返回剩余时间）
5. 调用 Supabase RPC `send_verification_email` 生成令牌
6. 发送验证邮件（通过 `emailService.sendVerificationEmail`）

#### **令牌生成**
- 通过 Supabase RPC 函数生成
- 有效期：24小时
- 存储为 `email_verification_token`

#### **邮件内容**
- 包含验证链接：`/api/auth/verify-email?token={token}`
- 链接会重定向到前端验证页面：`/auth/verify-email?token={token}`

### 2.3 验证邮箱 (`/api/auth/verify-email`)

**文件**: `app/api/auth/verify-email/route.js`

**支持两种请求方式**:

#### **POST 请求**（前端调用）
```javascript
POST /api/auth/verify-email
Body: { token: "verification_token" }
```

**验证流程**:
1. 验证令牌是否存在
2. 查找用户（通过 `email_verification_token`）
3. 检查邮箱是否已验证（如果已验证，返回错误）
4. 检查令牌是否过期
5. 更新用户状态：
   ```sql
   UPDATE users SET
     email_verified_at = NOW(),
     email_verification_token = NULL,
     email_verification_expire_at = NULL
   WHERE id = ?
   ```
6. 记录验证日志到 `email_verification_logs` 表

#### **GET 请求**（邮件链接）
```javascript
GET /api/auth/verify-email?token={token}
```
- 自动重定向到前端验证页面：`/auth/verify-email?token={token}`

### 2.4 前端验证页面 (`/auth/verify-email`)

**文件**: `app/auth/verify-email/page.js`

**功能特性**:
- 从 URL 参数获取验证令牌
- 自动调用验证 API
- 显示验证状态（成功/失败/加载中）
- 支持重新发送验证邮件
- 提供登录和返回首页链接

**状态处理**:
- **成功**: 显示成功消息，提供登录链接
- **失败**: 显示错误原因，提供重新发送按钮
- **加载中**: 显示加载动画

### 2.5 检查验证状态 (`/api/auth/check-verification`)

**文件**: `app/api/auth/check-verification/route.js`

**功能**:
- 通过用户 ID 检查邮箱验证状态
- 返回验证状态和用户信息

**请求**:
```javascript
GET /api/auth/check-verification?userId={user_id}
```

**返回**:
```javascript
{
  success: true,
  data: {
    verified: true/false,
    user: {
      id, email, name,
      emailVerifiedAt: timestamp or null
    }
  }
}
```

---

## 三、用户登录流程

### 3.1 前端登录页面 (`/auth/login`)

**文件**: `app/auth/login/page.js`

**功能特性**:
- 表单字段：
  - Email Address（必填）
  - Password（必填）
- 表单验证
- 自动重定向（如果已登录）
- 登录成功后保存会话到 `localStorage`

### 3.2 后端登录 API (`/api/auth/login`)

**文件**: `app/api/auth/login/route.js`

**核心逻辑**:

#### **输入验证**
- 验证 email 和 password 必填
- 验证 Supabase 配置

#### **角色检测**
- 支持从域名自动检测角色
- 支持显式指定角色

#### **用户查找**
```javascript
// 查找匹配邮箱和角色的用户
SELECT * FROM users 
WHERE email = ? AND role = ?
```

#### **密码验证**
- 使用 `bcrypt.compare` 验证密码
- 与存储的 `password_hash` 比较

#### **邮箱验证检查**
```javascript
// 可选：如果 REQUIRE_EMAIL_VERIFICATION === 'true'
if (!user.email_verified_at) {
  throw Error('Please verify your email before logging in')
}
```
**注意**: 默认情况下，邮箱验证是可选的，只有在环境变量 `REQUIRE_EMAIL_VERIFICATION=true` 时才会强制要求验证。

#### **更新登录信息**
- 更新 `last_login_domain` 字段（记录登录域名）

#### **返回数据**
```javascript
{
  success: true,
  message: "Login successful",
  data: user,  // 不包含 password_hash
  user: user   // 兼容性字段
}
```

---

## 四、密码重置流程

### 4.1 忘记密码 (`/api/auth/forgot-password`)

**文件**: `app/api/auth/forgot-password/route.js`

**功能特性**:

#### **限流保护**
- IP 限流：15分钟内最多3次请求
- 邮箱限流：15分钟内最多2次请求
- 冷却期：5分钟（防止频繁请求）

#### **安全特性**
- 即使用户不存在，也返回成功消息（防止邮箱枚举攻击）
- 检查是否有未过期的重置令牌
- 检查冷却期

#### **令牌生成**
- 调用 Supabase RPC `send_password_reset_email` 生成重置令牌
- 令牌有效期：30分钟
- 存储为 `reset_token_hash`

#### **发送重置邮件**
- 通过 `emailService.sendPasswordResetEmail` 发送
- 邮件包含重置链接：`/api/auth/reset-password?token={token}`

### 4.2 重置密码 (`/api/auth/reset-password`)

**文件**: `app/api/auth/reset-password/route.js`

**支持两种请求方式**:

#### **POST 请求**（重置密码）
```javascript
POST /api/auth/reset-password
Body: { token: "reset_token", newPassword: "new_password" }
```

**验证流程**:
1. 验证令牌和新密码必填
2. 验证密码长度（至少6个字符）
3. IP 限流检查
4. 查找用户（通过 `reset_token_hash`）
5. 检查令牌是否过期
6. 加密新密码（bcrypt, 12 rounds）
7. 更新密码并清除令牌：
   ```sql
   UPDATE users SET
     password_hash = ?,
     reset_token_hash = NULL,
     reset_token_expire_at = NULL,
     last_password_reset_sent_at = NULL
   WHERE id = ?
   ```
8. 记录重置日志

#### **GET 请求**（验证令牌）
```javascript
GET /api/auth/reset-password?token={token}
```
- 验证令牌有效性
- 重定向到前端重置页面：`/auth/reset-password?token={token}`

---

## 五、数据库结构

### 5.1 users 表字段

**核心字段**:
```sql
- id: UUID (主键)
- email: TEXT (唯一，必填)
- name: TEXT (必填)
- age: INTEGER (16-150，必填)
- password_hash: TEXT (加密后的密码)
- role: TEXT (user/merchant/admin，默认 'user')
- email_verified_at: TIMESTAMPTZ (邮箱验证时间戳)
- email_verification_token: TEXT (验证令牌)
- email_verification_expire_at: TIMESTAMPTZ (令牌过期时间)
- reset_token_hash: TEXT (密码重置令牌)
- reset_token_expire_at: TIMESTAMPTZ (重置令牌过期时间)
- last_password_reset_sent_at: TIMESTAMPTZ (最后发送重置邮件时间)
- registration_domain: TEXT (注册域名)
- last_login_domain: TEXT (最后登录域名)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 5.2 唯一性约束

**重要**: 系统支持同一邮箱注册不同角色
- 唯一性约束：`(email, role)` 组合唯一
- 允许：`user@example.com` 作为 user 和 merchant 两个账户

### 5.3 日志表

**email_verification_logs 表**:
- 记录邮箱验证和密码重置操作
- 字段：`user_id`, `email`, `action`, `token_hash`, `success`, `created_at`

---

## 六、安全特性

### 6.1 密码安全
- **加密算法**: bcrypt
- **Salt Rounds**: 12
- **密码长度**: 8-128字符（注册），6字符以上（重置）
- **密码存储**: 仅存储哈希值，不存储明文

### 6.2 限流保护
- **注册**: 无显式限流（依赖 Supabase）
- **发送验证邮件**: IP 3次/15分钟，邮箱 2次/15分钟
- **密码重置**: IP 3次/15分钟，邮箱 2次/15分钟
- **重置确认**: IP 5次/15分钟

### 6.3 令牌安全
- **验证令牌**: 24小时有效期
- **重置令牌**: 30分钟有效期
- **令牌存储**: 存储在数据库中，使用后立即清除
- **令牌过期检查**: 每次使用前检查过期时间

### 6.4 邮箱验证策略
- **默认**: 邮箱验证是可选的（`REQUIRE_EMAIL_VERIFICATION` 默认为 false）
- **可选强制**: 设置 `REQUIRE_EMAIL_VERIFICATION=true` 可强制要求验证
- **验证状态**: 存储在 `email_verified_at` 字段

### 6.5 防枚举攻击
- **密码重置**: 即使用户不存在也返回成功消息
- **错误消息**: 统一错误消息，不泄露用户是否存在

---

## 七、多角色支持

### 7.1 角色类型
- **user**: 普通用户（默认）
- **merchant**: 商家
- **admin**: 管理员

### 7.2 角色检测
- **自动检测**: 通过域名/路径自动检测角色（`getPortalFromHostname`, `getRoleFromPortal`）
- **显式指定**: 支持在请求中显式指定角色

### 7.3 多角色账户
- 同一邮箱可以注册不同角色
- 登录时需要匹配邮箱和角色
- 每个角色账户独立管理

---

## 八、前端状态管理

### 8.1 会话存储
- **存储位置**: `localStorage`
- **键名**: `userSession`
- **内容**: 用户信息（JSON 格式）
- **不包含**: `password_hash`（敏感信息）

### 8.2 会话格式
```javascript
{
  id: "user_id",
  email: "user@example.com",
  name: "User Name",
  age: 25,
  role: "user",
  email_verified_at: "2024-01-01T00:00:00Z" or null,
  created_at: "2024-01-01T00:00:00Z"
}
```

### 8.3 会话检查
- 页面加载时检查 `localStorage` 中的 `userSession`
- 如果不存在或无效，重定向到登录页面
- 账户页面显示邮箱验证状态横幅（如果未验证）

---

## 九、API 端点总结

### 9.1 认证相关 API

| 端点 | 方法 | 功能 | 文件 |
|------|------|------|------|
| `/api/auth/register` | POST | 用户注册 | `app/api/auth/register/route.js` |
| `/api/auth/login` | POST | 用户登录 | `app/api/auth/login/route.js` |
| `/api/auth/send-verification` | POST | 发送验证邮件 | `app/api/auth/send-verification/route.js` |
| `/api/auth/verify-email` | POST/GET | 验证邮箱 | `app/api/auth/verify-email/route.js` |
| `/api/auth/check-verification` | GET | 检查验证状态 | `app/api/auth/check-verification/route.js` |
| `/api/auth/forgot-password` | POST | 忘记密码 | `app/api/auth/forgot-password/route.js` |
| `/api/auth/reset-password` | POST/GET | 重置密码 | `app/api/auth/reset-password/route.js` |

### 9.2 前端页面

| 路径 | 功能 | 文件 |
|------|------|------|
| `/auth/register` | 注册页面 | `app/auth/register/page.js` |
| `/auth/login` | 登录页面 | `app/auth/login/page.js` |
| `/auth/verify-email` | 邮箱验证页面 | `app/auth/verify-email/page.js` |
| `/auth/forgot-password` | 忘记密码页面 | `app/auth/forgot-password/page.js` |
| `/auth/reset-password` | 重置密码页面 | `app/auth/reset-password/page.js` |

---

## 十、关键配置

### 10.1 环境变量

**必需变量**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**可选变量**:
```bash
REQUIRE_EMAIL_VERIFICATION=true  # 强制要求邮箱验证（默认 false）
NEXT_PUBLIC_SITE_URL=https://your-site.com  # 用于生成邮件链接
```

### 10.2 Supabase RPC 函数

**必需函数**:
- `send_verification_email(p_user_id UUID, p_email TEXT)`: 生成邮箱验证令牌
- `send_password_reset_email(p_user_id UUID, p_email TEXT)`: 生成密码重置令牌

---

## 十一、错误处理

### 11.1 错误代码

**验证错误**:
- `VALID_002`: 缺少必需字段
- `VALID_003`: 无效格式

**认证错误**:
- `AUTH_002`: 用户不存在或令牌无效
- `AUTH_003`: 令牌过期
- `AUTH_004`: 限流（请求过于频繁）
- `AUTH_005`: 邮箱已验证
- `INVALID_CREDENTIALS`: 无效的邮箱或密码
- `EMAIL_NOT_VERIFIED`: 邮箱未验证（仅在强制验证时）

**系统错误**:
- `SYS_001`: 内部服务器错误
- `CONFIG_ERROR`: 配置错误
- `DATABASE_QUERY_ERROR`: 数据库查询错误

### 11.2 错误响应格式

```javascript
{
  success: false,
  error: "ERROR_CODE",
  message: "Human-readable error message",
  requestId: "request_id"  // 用于追踪
}
```

---

## 十二、流程总结

### 12.1 完整注册流程

```
1. 用户访问 /auth/register
2. 填写注册表单
3. 前端验证表单
4. 调用 POST /api/auth/register
5. 后端验证数据
6. 检查用户是否存在（email + role）
7. 加密密码
8. 创建用户（email_verified_at = null）
9. 生成验证令牌（可选，不阻塞）
10. 发送验证邮件（可选，不阻塞）
11. 返回成功，保存会话到 localStorage
12. 自动调用 POST /api/auth/send-verification
13. 跳转到 /account
14. 用户点击邮件中的验证链接
15. 访问 GET /api/auth/verify-email?token=xxx
16. 重定向到 /auth/verify-email?token=xxx
17. 前端调用 POST /api/auth/verify-email
18. 后端验证令牌
19. 更新 email_verified_at
20. 清除验证令牌
21. 显示验证成功
```

### 12.2 完整登录流程

```
1. 用户访问 /auth/login
2. 填写登录表单
3. 调用 POST /api/auth/login
4. 后端查找用户（email + role）
5. 验证密码
6. 检查邮箱验证（可选，如果 REQUIRE_EMAIL_VERIFICATION=true）
7. 更新 last_login_domain
8. 返回用户数据（不含 password_hash）
9. 保存会话到 localStorage
10. 跳转到 /account
```

### 12.3 密码重置流程

```
1. 用户访问 /auth/forgot-password
2. 输入邮箱
3. 调用 POST /api/auth/forgot-password
4. 后端限流检查
5. 查找用户（即使用户不存在也返回成功）
6. 检查冷却期
7. 生成重置令牌（30分钟有效期）
8. 发送重置邮件
9. 用户点击邮件中的重置链接
10. 访问 GET /api/auth/reset-password?token=xxx
11. 重定向到 /auth/reset-password?token=xxx
12. 用户输入新密码
13. 调用 POST /api/auth/reset-password
14. 后端验证令牌
15. 检查令牌过期
16. 加密新密码
17. 更新密码并清除令牌
18. 显示重置成功
```

---

## 十三、注意事项

### 13.1 邮箱验证
- **默认**: 邮箱验证是可选的，未验证用户也可以登录
- **强制验证**: 设置 `REQUIRE_EMAIL_VERIFICATION=true` 可强制要求验证
- **验证状态**: 在账户页面显示验证横幅提醒用户

### 13.2 多角色支持
- 同一邮箱可以注册不同角色
- 登录时必须匹配邮箱和角色
- 每个角色账户独立管理

### 13.3 安全性
- 密码使用 bcrypt 加密（12 rounds）
- 所有令牌都有过期时间
- 实现了限流保护
- 防枚举攻击（密码重置）

### 13.4 错误处理
- 统一的错误处理机制
- 详细的错误代码和消息
- 请求 ID 用于追踪

---

## 十四、待改进项

### 14.1 已知问题
- 邮箱验证默认是可选的，可能需要强制验证
- 某些错误消息包含中文，需要统一为英文
- 令牌生成依赖 Supabase RPC 函数，需要确保这些函数存在

### 14.2 建议改进
- 添加更严格的密码强度要求
- 实现登录尝试次数限制
- 添加双因素认证（2FA）支持
- 改进错误消息国际化
- 添加账户锁定功能

---

*最后更新: 2024年12月*

