# 完整环境变量配置指南

## 📋 前端环境变量 (Vercel)

### 🔐 Supabase 配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase项目URL，用于前端连接数据库 | Supabase Dashboard > Settings > API > Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名密钥，用于前端API调用 | Supabase Dashboard > Settings > API > Project API keys > anon public | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 💳 Stripe 配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公钥，用于前端支付表单 | Stripe Dashboard > Developers > API keys > Publishable key | `pk_test_...` 或 `pk_live_...` |

### 🌐 应用配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | 应用域名，用于重定向和回调 | 部署后获得 | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_API_URL` | 后端API地址 | 部署后获得 | `https://your-backend.railway.app/v1` |

---

## 🔧 后端环境变量 (Railway)

### 🔐 Supabase 配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `SUPABASE_URL` | Supabase项目URL，用于后端连接数据库 | Supabase Dashboard > Settings > API > Project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase服务角色密钥，用于后端API调用 | Supabase Dashboard > Settings > API > Project API keys > service_role | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 💳 Stripe 配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe私钥，用于后端支付处理 | Stripe Dashboard > Developers > API keys > Secret key | `sk_test_...` 或 `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook密钥，用于验证Webhook | Stripe Dashboard > Developers > Webhooks > 选择endpoint > Signing secret | `whsec_...` |

### 🔑 认证配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `JWT_SECRET` | JWT签名密钥，用于用户认证 | 自己生成（至少32字符） | `your-super-secret-jwt-key-minimum-32-characters` |
| `JWT_EXPIRES_IN` | JWT过期时间 | 自定义 | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | 刷新令牌过期时间 | 自定义 | `7d` |
| `BCRYPT_SALT_ROUNDS` | 密码加密盐轮数 | 自定义（推荐12） | `12` |

### 🌐 CORS 配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `CORS_ORIGIN` | 允许跨域的前端域名 | 部署后获得 | `https://your-app.vercel.app` |
| `CORS_CREDENTIALS` | 是否允许携带凭证 | 自定义 | `true` |

### 🛡️ 安全配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `HELMET_ENABLED` | 是否启用Helmet安全中间件 | 自定义 | `true` |
| `CSP_ENABLED` | 是否启用内容安全策略 | 自定义 | `true` |
| `HSTS_ENABLED` | 是否启用HSTS | 自定义 | `true` |

### 🚦 限流配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `RATE_LIMIT_MAX_REQUESTS` | 限流最大请求数 | 自定义 | `1000` |
| `RATE_LIMIT_WINDOW_MS` | 限流时间窗口（毫秒） | 自定义 | `900000` (15分钟) |

### 📊 监控配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `LOG_LEVEL` | 日志级别 | 自定义 | `info` |
| `MONITORING_ENABLED` | 是否启用监控 | 自定义 | `true` |
| `HEALTH_CHECK_INTERVAL` | 健康检查间隔（毫秒） | 自定义 | `30000` |

### ⚙️ 系统配置
| 变量名 | 作用 | 获取方式 | 示例值 |
|--------|------|----------|--------|
| `NODE_ENV` | 运行环境 | 自动设置 | `production` |
| `PORT` | 服务器端口 | 自定义 | `8080` |

---

## 🔍 需要您自己获取的变量

### 1. Supabase 配置
**获取位置**: [Supabase Dashboard](https://supabase.com/dashboard)
1. 登录 Supabase
2. 选择您的项目
3. 进入 Settings > API
4. 复制 Project URL 和 API keys

### 2. Stripe 配置
**获取位置**: [Stripe Dashboard](https://dashboard.stripe.com)
1. 登录 Stripe
2. 进入 Developers > API keys
3. 复制 Publishable key 和 Secret key
4. 进入 Developers > Webhooks
5. 创建或选择 Webhook endpoint
6. 复制 Signing secret

### 3. JWT 密钥生成
**生成方式**: 使用以下命令生成强密钥
```bash
# 生成32字符随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用在线工具
# https://generate-secret.vercel.app/32
```

### 4. 域名配置
**获取方式**: 部署后获得
- **前端域名**: Vercel 部署后自动生成
- **后端域名**: Railway 部署后自动生成

---

## 📝 环境变量模板

### 前端 (.env.local)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application Configuration
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/v1
```

### 后端 (.env)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# CORS
CORS_ORIGIN=https://your-app.vercel.app
CORS_CREDENTIALS=true

# Security
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Monitoring
LOG_LEVEL=info
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# System
NODE_ENV=production
PORT=8080
```

---

## ⚠️ 重要注意事项

1. **敏感信息保护**: 不要将真实密钥提交到代码仓库
2. **环境分离**: 开发、测试、生产环境使用不同的密钥
3. **定期轮换**: 定期更换JWT密钥和数据库密钥
4. **权限最小化**: 只给必要的权限，不要使用过高的权限
5. **监控访问**: 定期检查API密钥的使用情况

---

## 🚀 快速配置检查

使用以下命令检查环境变量配置：
```bash
# 前端检查
npm run health:check

# 后端检查
cd backend && node -e "require('./load-env.js'); console.log('✅ 后端环境变量加载成功')"
```
