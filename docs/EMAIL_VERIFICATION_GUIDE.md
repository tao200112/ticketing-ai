# 邮箱验证功能指南

## 概述

本系统实现了完整的邮箱验证和找回密码功能，包括：

- ✅ 用户注册后自动发送验证邮件
- ✅ 未验证邮箱禁止关键操作（购票、创建活动、提现）
- ✅ 找回密码功能（邮件链接，30分钟有效）
- ✅ 智能限流（IP/邮箱限流）
- ✅ 人话提示信息
- ✅ Sentry 事件上报

## 技术架构

### 数据库表结构

#### 用户表新增字段
```sql
-- 邮箱验证相关字段
email_verified_at TIMESTAMPTZ,                    -- 邮箱验证时间
last_password_reset_sent_at TIMESTAMPTZ,          -- 最后发送重置邮件时间
reset_token_hash TEXT,                            -- 重置密码令牌哈希
reset_token_expire_at TIMESTAMPTZ,                -- 重置令牌过期时间
email_verification_token TEXT,                    -- 邮箱验证令牌
email_verification_expire_at TIMESTAMPTZ          -- 验证令牌过期时间
```

#### 新增表

**限流表 (rate_limits)**
```sql
CREATE TABLE rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,                              -- IP地址或邮箱
  type TEXT NOT NULL CHECK (type IN ('ip', 'email', 'action')),
  action TEXT NOT NULL,                           -- 操作类型
  count INTEGER DEFAULT 1,                        -- 尝试次数
  window_start TIMESTAMPTZ DEFAULT NOW(),         -- 窗口开始时间
  expires_at TIMESTAMPTZ NOT NULL,                -- 过期时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**邮箱验证日志表 (email_verification_logs)**
```sql
CREATE TABLE email_verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('verification_sent', 'verification_verified', 'password_reset_sent', 'password_reset_used')),
  token_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 核心服务

#### 1. 限流服务 (lib/rate-limiter.js)
- 使用 Upstash Redis 实现分布式限流
- 支持 IP、邮箱、操作类型限流
- 自动清理过期数据

#### 2. 邮件服务 (lib/email-service.js)
- 使用 Nodemailer 发送邮件
- 支持 HTML 和纯文本格式
- 美观的邮件模板

#### 3. 邮箱验证中间件 (lib/email-verification-middleware.js)
- 检查用户邮箱验证状态
- 阻止未验证用户的关键操作
- 提供友好的错误提示

## API 接口

### 1. 发送验证邮件
```http
POST /api/auth/send-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "验证邮件已发送，请检查您的邮箱",
  "data": {
    "email": "user@example.com",
    "expiresAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 2. 验证邮箱
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token"
}
```

### 3. 找回密码
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 4. 重置密码
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "new_password"
}
```

### 5. 检查验证状态
```http
GET /api/auth/check-verification?userId=user_id
```

## 前端页面

### 1. 邮箱验证页面
- 路径：`/auth/verify-email`
- 功能：处理邮箱验证链接
- 特性：自动验证、重新发送、友好提示

### 2. 找回密码页面
- 路径：`/auth/forgot-password`
- 功能：申请密码重置
- 特性：限流提示、邮件发送状态

### 3. 重置密码页面
- 路径：`/auth/reset-password`
- 功能：设置新密码
- 特性：令牌验证、密码强度检查

## 限流策略

### 1. 发送验证邮件
- IP 限流：15分钟内最多 3 次
- 邮箱限流：15分钟内最多 2 次
- 冷却期：5分钟

### 2. 找回密码
- IP 限流：15分钟内最多 3 次
- 邮箱限流：15分钟内最多 2 次
- 冷却期：5分钟

### 3. 重置密码确认
- IP 限流：15分钟内最多 5 次

## 错误码

| 错误码 | 说明 | HTTP状态 |
|--------|------|----------|
| AUTH_004 | 请求过于频繁 | 429 |
| AUTH_005 | 邮箱已验证 | 400 |
| AUTH_006 | 需要验证邮箱 | 403 |

## 环境变量配置

```bash
# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis 限流配置
UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token

# 网站配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 部署步骤

### 1. 数据库迁移
```bash
# 在 Supabase SQL Editor 中运行
supabase/migrations/email_verification_schema.sql
```

### 2. 安装依赖
```bash
npm install @upstash/redis nodemailer @types/nodemailer
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp env.template .env.local

# 编辑环境变量
nano .env.local
```

### 4. 测试功能
```bash
# 运行邮箱验证测试
npm run test:email-verification
```

## 使用示例

### 1. 在组件中检查邮箱验证状态
```javascript
import { useEmailVerification } from '../hooks/useEmailVerification';

function MyComponent({ user }) {
  const { isVerified, isLoading, resendVerification } = useEmailVerification(user);

  if (isLoading) return <div>检查中...</div>;
  
  if (!isVerified) {
    return (
      <div>
        <p>请验证您的邮箱</p>
        <button onClick={resendVerification}>
          重新发送验证邮件
        </button>
      </div>
    );
  }

  return <div>邮箱已验证</div>;
}
```

### 2. 在 API 路由中使用邮箱验证中间件
```javascript
import { withEmailVerification } from '../../../lib/email-verification-middleware';

async function purchaseHandler(req, res) {
  // 购票逻辑
  res.json({ success: true });
}

export default withEmailVerification(purchaseHandler, {
  requireVerification: true,
  allowedActions: ['purchase']
});
```

### 3. 显示邮箱验证横幅
```javascript
import EmailVerificationBanner from '../components/EmailVerificationBanner';

function Layout({ user, children }) {
  return (
    <div>
      <EmailVerificationBanner user={user} />
      {children}
    </div>
  );
}
```

## 监控和日志

### 1. Sentry 事件
- `AUTH/EMAIL_NOT_VERIFIED` - 未验证邮箱尝试关键操作
- `AUTH/RATE_LIMIT` - 触发限流

### 2. 数据库日志
- 所有邮件发送记录
- 验证和重置操作记录
- 限流触发记录

### 3. 性能监控
- 邮件发送成功率
- 验证完成率
- 限流触发频率

## 故障排除

### 1. 邮件发送失败
- 检查 SMTP 配置
- 验证邮箱凭据
- 查看邮件服务日志

### 2. 限流不生效
- 检查 Redis 连接
- 验证限流配置
- 查看限流日志

### 3. 验证链接无效
- 检查令牌过期时间
- 验证数据库字段
- 查看验证日志

## 安全考虑

1. **令牌安全**：使用加密哈希存储令牌
2. **限流保护**：防止暴力攻击和垃圾邮件
3. **过期机制**：验证链接和重置链接都有过期时间
4. **日志记录**：记录所有敏感操作
5. **错误处理**：不泄露敏感信息

## 性能优化

1. **Redis 缓存**：使用 Redis 存储限流数据
2. **数据库索引**：为查询字段创建索引
3. **异步处理**：邮件发送使用异步处理
4. **批量操作**：定期清理过期数据

## 扩展功能

1. **多语言支持**：邮件模板多语言化
2. **邮件模板**：可配置的邮件模板
3. **通知渠道**：支持短信、推送等通知方式
4. **高级限流**：基于用户行为的智能限流
