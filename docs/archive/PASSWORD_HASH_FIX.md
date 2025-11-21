# Password Hash NULL 约束修复指南

## 问题描述

Google OAuth 登录时出现 "Database error saving new user" 错误，原因是 `password_hash` 字段可能仍然有 `NOT NULL` 约束，导致无法创建没有密码的 OAuth 用户。

## 解决方案

### 1. 运行强制迁移脚本

在 Supabase SQL Editor 中运行：

```sql
-- 文件: supabase/migrations/force_password_hash_nullable.sql
```

这个脚本会：
- 使用多种方法移除 `password_hash` 的 `NOT NULL` 约束
- 验证字段是否已允许 NULL
- 更新现有 Google OAuth 用户的 `password_hash` 为 NULL
- 显示当前状态

### 2. 代码修复

已更新 `app/api/auth/callback/route.js`，在创建 Google OAuth 用户时**显式设置** `password_hash: null`：

```javascript
const newUserData = {
  email: userEmail,
  name: userName || 'User',
  age: 18,
  auth_provider: 'google',
  email_verified_at: supabaseUser.email_confirmed_at || new Date().toISOString(),
  role: targetRole,
  password_hash: null // 显式设置为 null
}
```

## 为什么需要显式设置 NULL？

1. **数据库约束**：即使字段允许 NULL，某些数据库驱动或 ORM 可能在没有显式设置时使用默认值
2. **代码清晰性**：明确表示这是 OAuth 用户，没有密码
3. **避免意外**：防止某些数据库配置使用空字符串或其他默认值

## 后续：在设置页面添加/修改密码

正如您提到的，用户可以在设置页面添加或修改密码。这需要：

1. **检查 `auth_provider`**：如果是 `'google'`，显示"设置密码"选项
2. **密码验证**：如果已有密码，需要验证旧密码才能修改
3. **密码哈希**：使用 `bcrypt` 对新密码进行哈希
4. **更新数据库**：更新 `password_hash` 字段

### 示例代码（设置页面）

```javascript
// 检查用户是否使用 Google 登录
if (user.auth_provider === 'google' && !user.password_hash) {
  // 显示"设置密码"表单
}

// 设置密码
const handleSetPassword = async (newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await updateUser({ password_hash: hashedPassword })
}

// 修改密码（需要验证旧密码）
const handleChangePassword = async (oldPassword, newPassword) => {
  // 验证旧密码
  const isValid = await bcrypt.compare(oldPassword, user.password_hash)
  if (!isValid) {
    throw new Error('旧密码不正确')
  }
  
  // 设置新密码
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await updateUser({ password_hash: hashedPassword })
}
```

## 验证步骤

1. **运行迁移脚本**：在 Supabase SQL Editor 中执行 `force_password_hash_nullable.sql`
2. **检查字段状态**：确认 `password_hash` 的 `is_nullable` 为 `'YES'`
3. **测试 Google 登录**：尝试使用 Google OAuth 登录
4. **检查数据库**：确认新用户的 `password_hash` 为 `NULL`

## 常见问题

### Q: 迁移脚本显示 "password_hash is still NOT NULL"
A: 可能需要手动检查表结构，或者表中有其他约束。可以尝试：
```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

### Q: 现有用户会受影响吗？
A: 不会。只有 Google OAuth 用户的 `password_hash` 会被设置为 NULL。使用邮箱/密码注册的用户不受影响。

### Q: 用户设置了密码后，还能用 Google 登录吗？
A: 可以。`auth_provider` 和 `password_hash` 是独立的字段。用户可以：
- 使用 Google 登录（如果 `auth_provider = 'google'`）
- 使用邮箱/密码登录（如果 `password_hash` 不为 NULL）

## 相关文件

- `supabase/migrations/force_password_hash_nullable.sql` - 强制迁移脚本
- `supabase/migrations/add_auth_provider_to_users.sql` - 原始迁移脚本
- `app/api/auth/callback/route.js` - OAuth 回调处理
- `app/account/page.js` - 账户设置页面（需要添加密码设置功能）

