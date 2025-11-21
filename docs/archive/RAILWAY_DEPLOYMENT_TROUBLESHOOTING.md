# Railway 后端部署故障排除指南

## 🚨 当前问题分析

### 错误信息
```
npm error code EBUSY
npm error syscall rmdir
npm error path /app/node_modules/.cache
npm error errno -16
npm error EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

### 问题原因
1. **npm命令过时**: `npm ci --only=production` 在新版本npm中已废弃
2. **文件系统锁定**: Docker构建过程中缓存目录被占用
3. **构建过程复杂**: 多阶段构建可能导致文件冲突

## ✅ 已修复的问题

### 1. 更新npm命令
- ❌ `npm ci --only=production` (已废弃)
- ✅ `npm ci --omit=dev` (新语法)

### 2. 简化Dockerfile
- 移除了复杂的多阶段构建
- 添加了缓存清理命令
- 简化了文件复制过程

### 3. 更新Railway配置
- 更新了 `railway.json` 和 `railway.toml`
- 使用新的npm命令语法

## 🛠️ 解决方案

### 方案1: 使用简化的Dockerfile (推荐)
```bash
# 在Railway中设置Dockerfile路径
Dockerfile: Dockerfile.backend.simple
```

### 方案2: 手动部署步骤
1. **清理缓存**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   ```

2. **重新安装依赖**
   ```bash
   npm install --omit=dev
   ```

3. **测试本地运行**
   ```bash
   npm start
   ```

### 方案3: 使用Railway CLI
```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 部署
railway up
```

## 🔧 环境变量配置

确保在Railway中设置了以下环境变量：

### 必需变量
```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://htaqcvnyipiqdbmvvfvj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
JWT_SECRET=your-jwt-secret-minimum-32-characters
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 可选变量
```bash
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_CREDENTIALS=true
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## 🚀 重新部署步骤

### 1. 清理Railway项目
- 删除现有的部署
- 清理构建缓存

### 2. 更新配置
- 使用修复后的 `railway.json` 和 `railway.toml`
- 或使用 `Dockerfile.backend.simple`

### 3. 重新部署
- 推送代码到GitHub
- Railway会自动重新构建

### 4. 验证部署
```bash
# 检查健康状态
curl https://your-backend.railway.app/health

# 检查API
curl https://your-backend.railway.app/v1/events
```

## 🔍 调试技巧

### 1. 查看构建日志
- 在Railway Dashboard中查看详细的构建日志
- 关注npm安装过程

### 2. 本地测试Docker
```bash
# 构建镜像
docker build -f Dockerfile.backend.simple -t partytix-backend .

# 运行容器
docker run -p 3001:3001 partytix-backend
```

### 3. 检查依赖
```bash
# 检查package.json
cat backend/package.json

# 检查依赖版本
npm list --depth=0
```

## 📋 常见问题

### Q: 仍然出现EBUSY错误？
A: 尝试以下步骤：
1. 删除 `package-lock.json`
2. 使用 `npm install` 而不是 `npm ci`
3. 在Railway中设置 `NPM_CONFIG_CACHE=/tmp/.npm`

### Q: 端口冲突？
A: 确保Railway使用正确的端口：
- 设置 `PORT=8080` 环境变量
- 检查 `railway.toml` 中的端口配置

### Q: 环境变量未加载？
A: 检查：
1. 变量名是否正确
2. 是否在正确的环境中设置
3. 重启服务后变量是否生效

## 🎯 最佳实践

1. **使用简化的Dockerfile** - 减少构建复杂性
2. **定期清理缓存** - 避免文件系统问题
3. **监控构建日志** - 及时发现问题
4. **测试本地构建** - 确保配置正确
5. **使用健康检查** - 监控服务状态

---

**💡 提示**: 如果问题持续存在，建议使用 `Dockerfile.backend.simple` 进行部署，它更稳定且易于调试。
