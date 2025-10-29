# 环境变量配置指南

## 📋 配置概览

邮箱验证功能需要配置以下环境变量：
- **SMTP 邮件服务**：发送验证邮件和重置密码邮件
- **Redis 限流服务**：实现分布式限流保护

## 📧 SMTP 邮件服务配置

### 方案1：Gmail SMTP（推荐，免费）

#### 步骤1：启用两步验证
1. 登录 [Google 账户安全设置](https://myaccount.google.com/security)
2. 找到"登录 Google"部分
3. 点击"两步验证"
4. 按照提示启用两步验证

#### 步骤2：生成应用专用密码
1. 在安全设置中找到"应用专用密码"
2. 选择"邮件"应用
3. 生成16位密码（**重要：保存好，只显示一次**）

#### 步骤3：配置环境变量
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-digit-app-password
```

### 方案2：其他邮件服务商

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### QQ邮箱
```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-qq@qq.com
SMTP_PASS=your-authorization-code
```

## 🔴 Redis 限流服务配置

### 方案1：Upstash Redis（推荐，免费额度）

#### 步骤1：注册账户
1. 访问 [Upstash Console](https://console.upstash.com/)
2. 点击 "Sign Up"
3. 使用 GitHub 或 Google 账户注册
4. 免费账户有 10,000 请求/天额度

#### 步骤2：创建 Redis 数据库
1. 登录后点击 "Create Database"
2. 填写数据库信息：
   - **Name**: `ticketing-ai-rate-limit`
   - **Type**: 选择 "Global" 或 "Regional"
   - **Region**: 选择离你最近的区域
3. 点击 "Create"

#### 步骤3：获取连接信息
1. 在数据库详情页面找到连接信息
2. 复制以下值：
   - `UPSTASH_REDIS_URL`
   - `UPSTASH_REDIS_TOKEN`

#### 步骤4：配置环境变量
```bash
UPSTASH_REDIS_URL=https://your-database-name.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token
```

### 方案2：本地 Redis（开发环境）

#### 步骤1：安装 Redis
```bash
# Windows (使用 Chocolatey)
choco install redis-64

# 或下载 Redis for Windows
# https://github.com/microsoftarchive/redis/releases
```

#### 步骤2：启动 Redis
```bash
redis-server
```

#### 步骤3：配置环境变量
```bash
UPSTASH_REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_TOKEN=not-needed-for-local
```

## 🛠️ 完整环境变量配置

### 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件：

```bash
# ===========================================
# 基础配置
# ===========================================
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ===========================================
# Supabase 配置
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ===========================================
# Sentry 配置
# ===========================================
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn
SENTRY_DSN=your-backend-sentry-dsn

# ===========================================
# 邮件配置 (Gmail 示例)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-digit-app-password

# ===========================================
# Redis 限流配置 (Upstash 示例)
# ===========================================
UPSTASH_REDIS_URL=https://your-database-name.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token

# ===========================================
# 其他配置
# ===========================================
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
UPLOAD_MAX_SIZE=10485760
```

## 🧪 测试配置

### 1. 测试邮件服务
```bash
# 运行邮件服务测试
node -e "
import emailService from './lib/email-service.js';
emailService.verifyConfig().then(result => {
  console.log('邮件服务配置:', result ? '✅ 正常' : '❌ 失败');
});
"
```

### 2. 测试 Redis 连接
```bash
# 运行 Redis 连接测试
node -e "
import rateLimiter from './lib/rate-limiter.js';
rateLimiter.checkEmailLimit('test@example.com', 'test', 1, 1).then(result => {
  console.log('Redis 连接:', result.allowed ? '✅ 正常' : '❌ 失败');
});
"
```

### 3. 运行完整测试
```bash
# 运行邮箱验证功能测试
npm run test:email-verification-simple
```

## 🚀 部署到生产环境

### Vercel 部署
1. 在 Vercel 项目设置中添加环境变量
2. 确保所有必需的环境变量都已配置
3. 重新部署项目

### 其他平台
1. 在平台的环境变量设置中添加配置
2. 确保变量名称和值正确
3. 重启应用服务

## 🔒 安全注意事项

1. **不要提交 .env.local 到版本控制**
2. **使用强密码和专用密码**
3. **定期轮换 API 密钥**
4. **限制 Redis 访问权限**
5. **监控异常使用情况**

## ❓ 常见问题

### Q: Gmail 应用专用密码在哪里？
A: Google 账户 → 安全 → 两步验证 → 应用专用密码

### Q: Upstash 免费额度够用吗？
A: 10,000 请求/天对于大多数应用足够，超出后可升级

### Q: 本地 Redis 和 Upstash 有什么区别？
A: 本地 Redis 适合开发，Upstash 适合生产环境

### Q: 邮件发送失败怎么办？
A: 检查 SMTP 配置、网络连接和邮件服务商限制

### Q: Redis 连接失败怎么办？
A: 检查 URL 和 Token 是否正确，网络是否可达

## 📞 获取帮助

如果遇到配置问题，可以：
1. 查看控制台错误信息
2. 运行测试脚本诊断
3. 检查服务商文档
4. 联系技术支持
