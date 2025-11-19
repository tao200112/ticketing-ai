# PartyTix Auth 统一重构 - 最终版本

## ✅ 最终实现逻辑

### require_email_verification 字段规则

1. **Google 登录用户** → `require_email_verification = false`
   - 不需要显示邮箱验证提示
   - 登录后需要设置密码

2. **商家邀请码用户** → `merchant_members.require_email_verification = false`
   - 不需要显示邮箱验证提示
   - 激活后直接可用

3. **邮箱注册新用户** → `users.require_email_verification = true`
   - 显示"未验证邮箱"提示（小黄条）
   - **不拦截功能**，用户可以正常使用所有功能
   - 提示文案："您的邮箱地址尚未验证。验证邮箱可以帮助您找回密码并接收活动通知。您可以继续使用所有功能。"

4. **旧用户** → 保持现有值或默认 `false`（向后兼容）

## 📋 前端显示逻辑

### Account 页面提示

```javascript
// 显示条件：
// - require_email_verification = true（邮箱注册用户）
// - email_verified_at 为 null（邮箱未验证）
if (user.require_email_verification && !user.email_verified_at) {
  // 显示"小黄条"提示
  // 提供"发送验证邮件"按钮
  // 不拦截任何功能
}
```

## 🔄 工作流程

### Google 登录
1. 完成 Google OAuth
2. `/api/auth/after-login` 创建用户记录，`require_email_verification = false`
3. 返回 `needPasswordSetup: true`
4. 跳转到 `/onboarding/set-password`
5. 设置密码后继续使用

### 邮箱注册
1. 用户注册账号
2. `/api/auth/after-login` 创建用户记录，`require_email_verification = true`
3. 用户可以直接使用所有功能
4. Account 页面显示"未验证邮箱"提示（如果 `email_verified_at` 为 null）
5. 用户可以点击"发送验证邮件"按钮

### 商家邀请码
1. 用户登录（Google 或邮箱）
2. 调用 `/api/merchant/activate-invite`
3. 创建 `merchant_members` 记录，`require_email_verification = false`
4. 跳转到 `/merchant/dashboard`

## 📁 修改的文件

### API 修改
- ✅ `app/api/auth/after-login/route.js` - 邮箱注册用户设置 `require_email_verification = true`
- ✅ `app/api/users/sync/route.js` - 邮箱注册用户设置 `require_email_verification = true`

### 前端修改
- ✅ `app/account/page.js` - 更新显示逻辑：`require_email_verification && !email_verified_at`

## 🎯 核心原则

1. **不拦截功能**：`require_email_verification` 仅用于显示提示，不影响功能使用
2. **友好提醒**：提示文案明确说明"可以继续使用所有功能"
3. **找回密码**：验证邮箱有助于找回密码功能
4. **向后兼容**：旧用户保持现有值或默认 `false`

## ✨ 最终效果

- ✅ Google 登录：无提示，需设置密码
- ✅ 商家邀请码：无提示，直接可用
- ✅ 邮箱注册：显示友好提示，不拦截功能
- ✅ 所有账号统一在 `auth.users` 中管理
- ✅ 验证逻辑基于业务表，不再依赖 `email_confirmed_at`

重构完成！🎉


