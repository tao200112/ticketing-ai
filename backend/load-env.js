// 加载环境变量
require('dotenv').config();

// 设置环境变量（移除硬编码的敏感信息）
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '3001';

// 检查必需的环境变量
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ 缺少必需的环境变量:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n请设置这些环境变量后再启动服务器。');
  console.error('参考 .env.example 文件了解如何配置。');
  process.exit(1);
}

// 设置可选的环境变量（使用默认值）
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || '12';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_your-stripe-secret-key-here';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your-webhook-secret-here';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
process.env.CORS_CREDENTIALS = process.env.CORS_CREDENTIALS || 'true';
process.env.HELMET_ENABLED = process.env.HELMET_ENABLED || 'true';
process.env.CSP_ENABLED = process.env.CSP_ENABLED || 'true';
process.env.HSTS_ENABLED = process.env.HSTS_ENABLED || 'true';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '1000';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '900000';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
process.env.MONITORING_ENABLED = process.env.MONITORING_ENABLED || 'true';
process.env.HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || '30000';

console.log('✅ 环境变量已加载');
console.log(`📊 数据库: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
console.log(`🔑 JWT: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`);
console.log(`🌐 CORS: ${process.env.CORS_ORIGIN}`);
