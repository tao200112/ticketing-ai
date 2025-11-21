# 环境变量详细说明

## 📋 概述

本文档详细说明了 PartyTix 应用程序中使用的所有环境变量，包括其用途、类型、默认值和配置要求。

## 🎯 前端环境变量 (Vercel)

### 基础配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NODE_ENV` | string | ✅ | `production` | 运行环境 (development/production) |
| `NEXT_PUBLIC_SITE_URL` | string | ✅ | - | 前端应用的主域名 (https://your-app.vercel.app) |

### 数据库配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | ✅ | - | Supabase 项目 URL (https://xxx.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | ✅ | - | Supabase 匿名密钥 (公开密钥) |

**获取方式**:
1. 登录 Supabase Dashboard
2. 选择项目 > Settings > API
3. 复制 Project URL 和 anon public key

### 支付配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | ✅ | - | Stripe 公开密钥 (pk_live_... 或 pk_test_...) |

**获取方式**:
1. 登录 Stripe Dashboard
2. 选择 Developers > API keys
3. 复制 Publishable key

### API 配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | string | ✅ | - | 后端 API 基础 URL (https://your-backend.railway.app/v1) |

## 🔧 后端环境变量 (Railway)

### 基础配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NODE_ENV` | string | ✅ | `production` | 运行环境 |
| `PORT` | number | ❌ | `8080` | 服务器端口 (Railway 自动设置) |

### 数据库配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `SUPABASE_URL` | string | ✅ | - | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | string | ✅ | - | Supabase 服务角色密钥 (私有密钥) |

**获取方式**:
1. 登录 Supabase Dashboard
2. 选择项目 > Settings > API
3. 复制 Project URL 和 service_role secret key

### 认证配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `JWT_SECRET` | string | ✅ | - | JWT 签名密钥 (至少 32 字符) |
| `JWT_EXPIRES_IN` | string | ❌ | `24h` | JWT 过期时间 |
| `BCRYPT_SALT_ROUNDS` | number | ❌ | `12` | 密码加密盐轮数 |

**JWT_SECRET 生成**:
```bash
# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -hex 32
```

### 支付配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `STRIPE_SECRET_KEY` | string | ✅ | - | Stripe 私有密钥 (sk_live_... 或 sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | string | ✅ | - | Stripe Webhook 签名密钥 (whsec_...) |

**获取方式**:
1. 登录 Stripe Dashboard
2. 选择 Developers > API keys
3. 复制 Secret key
4. 选择 Webhooks > 创建端点 > 复制签名密钥

### CORS 配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `CORS_ORIGIN` | string | ✅ | - | 允许的前端域名 (https://your-app.vercel.app) |
| `CORS_CREDENTIALS` | boolean | ❌ | `true` | 是否允许携带凭证 |

### 安全配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `HELMET_ENABLED` | boolean | ❌ | `true` | 是否启用 Helmet 安全中间件 |
| `CSP_ENABLED` | boolean | ❌ | `true` | 是否启用内容安全策略 |
| `HSTS_ENABLED` | boolean | ❌ | `true` | 是否启用 HTTP 严格传输安全 |

### 速率限制

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `RATE_LIMIT_MAX_REQUESTS` | number | ❌ | `1000` | 时间窗口内最大请求数 |
| `RATE_LIMIT_WINDOW_MS` | number | ❌ | `900000` | 时间窗口长度 (毫秒) |

### 日志配置

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|------|
| `LOG_LEVEL` | string | ❌ | `info` | 日志级别 (error/warn/info/debug) |
| `MONITORING_ENABLED` | boolean | ❌ | `true` | 是否启用监控 |

## 🔐 安全注意事项

### 1. 密钥管理
- **永远不要**将敏感密钥提交到代码仓库
- 使用环境变量存储所有敏感信息
- 定期轮换密钥和密码

### 2. 密钥类型说明
- **公开密钥**: 可以安全地暴露在前端代码中
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **私有密钥**: 必须保密，只能在后端使用
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `JWT_SECRET`

### 3. 生产环境检查清单
- [ ] 使用生产环境的 Stripe 密钥 (sk_live_...)
- [ ] 使用强 JWT 密钥 (至少 32 字符)
- [ ] 启用所有安全中间件
- [ ] 配置正确的 CORS 域名
- [ ] 设置适当的速率限制

## 🧪 测试环境配置

### 开发环境
```bash
# 使用测试密钥
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 使用开发数据库
SUPABASE_URL=https://xxx.supabase.co
```

### 生产环境
```bash
# 使用生产密钥
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# 使用生产数据库
SUPABASE_URL=https://xxx.supabase.co
```

## 🔍 环境变量验证

### 前端验证脚本
```javascript
// 在浏览器控制台中运行
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_API_URL'
];

const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
  console.error('Missing environment variables:', missing);
} else {
  console.log('All required environment variables are set');
}
```

### 后端验证脚本
```javascript
// 在服务器启动时运行
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'CORS_ORIGIN'
];

const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}
```

## 📝 配置示例

### Vercel 环境变量
```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://partytix.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51ABC123...
NEXT_PUBLIC_API_URL=https://partytix-backend.railway.app/v1
```

### Railway 环境变量
```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
STRIPE_SECRET_KEY=sk_live_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
CORS_ORIGIN=https://partytix.vercel.app
CORS_CREDENTIALS=true
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
MONITORING_ENABLED=true
```

---

**重要提醒**: 请根据您的实际部署环境调整这些环境变量值，并确保所有敏感信息都通过安全的方式管理。
