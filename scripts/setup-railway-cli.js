#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Railway CLI 配置脚本\n');

// 检查 railway.json
console.log('📄 检查 railway.json:');
if (fs.existsSync('railway.json')) {
  const config = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
  console.log('  ✅ railway.json 存在');
  console.log(`  📋 配置: ${JSON.stringify(config, null, 2)}`);
} else {
  console.log('  ❌ railway.json 不存在');
}

// 检查 backend 目录
console.log('\n📁 检查 backend 目录:');
if (fs.existsSync('backend')) {
  console.log('  ✅ backend 目录存在');
  
  // 检查关键文件
  const backendFiles = ['package.json', 'server.js', 'Dockerfile'];
  backendFiles.forEach(file => {
    if (fs.existsSync(`backend/${file}`)) {
      console.log(`    ✅ ${file} 存在`);
    } else {
      console.log(`    ❌ ${file} 缺失`);
    }
  });
} else {
  console.log('  ❌ backend 目录不存在');
}

// 生成 Railway CLI 命令
console.log('\n🔧 Railway CLI 命令:');
console.log('1. 安装 Railway CLI:');
console.log('   npm install -g @railway/cli');
console.log('');
console.log('2. 登录 Railway:');
console.log('   railway login');
console.log('');
console.log('3. 连接到项目:');
console.log('   railway link');
console.log('');
console.log('4. 设置环境变量:');
console.log('   railway variables set NODE_ENV=production');
console.log('   railway variables set PORT=8080');
console.log('   railway variables set SUPABASE_URL=https://your-project.supabase.co');
console.log('   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
console.log('   railway variables set JWT_SECRET=your-production-jwt-secret');
console.log('   railway variables set STRIPE_SECRET_KEY=sk_live_your-secret-key');
console.log('   railway variables set CORS_ORIGIN=https://your-frontend-domain.vercel.app');
console.log('');
console.log('5. 重新部署:');
console.log('   railway up');
console.log('');
console.log('6. 查看日志:');
console.log('   railway logs');
console.log('');
console.log('7. 查看服务状态:');
console.log('   railway status');

// 生成环境变量文件
console.log('\n📝 生成环境变量文件:');
const envVars = [
  'NODE_ENV=production',
  'PORT=8080',
  'SUPABASE_URL=https://your-project.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
  'JWT_SECRET=your-production-jwt-secret-minimum-32-characters',
  'JWT_EXPIRES_IN=24h',
  'JWT_REFRESH_EXPIRES_IN=7d',
  'BCRYPT_SALT_ROUNDS=12',
  'STRIPE_SECRET_KEY=sk_live_your-secret-key',
  'STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret',
  'CORS_ORIGIN=https://your-frontend-domain.vercel.app',
  'CORS_CREDENTIALS=true',
  'HELMET_ENABLED=true',
  'CSP_ENABLED=true',
  'HSTS_ENABLED=true',
  'RATE_LIMIT_MAX_REQUESTS=1000',
  'RATE_LIMIT_WINDOW_MS=900000',
  'LOG_LEVEL=info',
  'MONITORING_ENABLED=true',
  'HEALTH_CHECK_INTERVAL=30000'
];

const envContent = envVars.join('\n');
fs.writeFileSync('railway-env.txt', envContent);
console.log('  ✅ 已生成 railway-env.txt 文件');
console.log('  📋 您可以将此文件内容复制到 Railway Dashboard 的 Variables 页面');

console.log('\n✅ Railway CLI 配置脚本完成');
