#!/bin/bash

echo "🚀 设置 Railway 环境变量..."

# 基础配置
echo "设置基础配置..."
railway variables set NODE_ENV=production
railway variables set PORT=8080

# 数据库配置
echo "设置数据库配置..."
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 认证配置
echo "设置认证配置..."
railway variables set JWT_SECRET=your-production-jwt-secret-minimum-32-characters
railway variables set JWT_EXPIRES_IN=24h
railway variables set JWT_REFRESH_EXPIRES_IN=7d
railway variables set BCRYPT_SALT_ROUNDS=12

# 支付配置
echo "设置支付配置..."
railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# CORS 配置
echo "设置 CORS 配置..."
railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app
railway variables set CORS_CREDENTIALS=true

# 安全配置
echo "设置安全配置..."
railway variables set HELMET_ENABLED=true
railway variables set CSP_ENABLED=true
railway variables set HSTS_ENABLED=true

# 速率限制
echo "设置速率限制..."
railway variables set RATE_LIMIT_MAX_REQUESTS=1000
railway variables set RATE_LIMIT_WINDOW_MS=900000

# 日志配置
echo "设置日志配置..."
railway variables set LOG_LEVEL=info

# 监控配置
echo "设置监控配置..."
railway variables set MONITORING_ENABLED=true
railway variables set HEALTH_CHECK_INTERVAL=30000

echo "✅ 环境变量设置完成！"
echo ""
echo "🔧 下一步："
echo "1. 替换占位符为真实值"
echo "2. 运行: railway up"
echo "3. 查看日志: railway logs"
