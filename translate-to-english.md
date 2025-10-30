# Translation Guide - Replace All Chinese Text with English

## Files That Need Translation

This document lists all files containing Chinese characters that need to be translated to English.

## Priority Files (User-Facing)

### 1. Components
- `components/RegisterForm.js` - ✅ Partially done
- `components/LoginForm.js` - ✅ Mostly done
- `components/EmailVerificationBanner.js` - Needs checking
- Other component files

### 2. Pages
- `app/account/page.js` - Needs translation
- `app/auth/login/page.js` - Needs checking
- `app/auth/register/page.js` - Mostly English
- All other page files

### 3. API Routes
- `app/api/auth/register/route.js` - Needs translation for error messages
- `app/api/auth/login/route.js` - Needs checking
- All other API route files

### 4. Error Handler
- `lib/error-handler.js` - ✅ Already translated to English

## Translation Guidelines

1. **User-facing text**: Always translate (labels, buttons, error messages, success messages)
2. **Comments**: Translate if they're important for understanding
3. **Console logs**: Can keep Chinese for debugging, but prefer English
4. **Code variable names**: Should already be in English

## Common Translations

- 注册账号 → Register Account
- 登录 → Sign In / Login
- 姓名 → Name
- 邮箱 → Email
- 密码 → Password
- 确认密码 → Confirm Password
- 年龄 → Age
- 注册 → Register
- 登录 → Sign In
- 已有账号？→ Already have an account?
- 立即登录 → Sign in now
- 请填写所有必需字段 → Please fill in all required fields
- 密码不一致 → Passwords do not match
- 年龄必须年满16岁 → Age must be 16 or older
- 注册失败 → Registration failed
- 网络错误 → Network error

## Status

- [x] RegisterForm.js - Basic translations done
- [x] LoginForm.js - Basic translations done
- [x] error-handler.js - All English
- [ ] All other files - In progress

