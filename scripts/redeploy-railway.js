#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Railway 重新部署准备...\n');

// 检查关键文件
const criticalFiles = [
  'railway.json',
  'backend/package.json',
  'backend/server.js',
  'backend/Dockerfile'
];

console.log('📋 检查关键文件:');
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file} - 存在`);
  } else {
    console.log(`  ❌ ${file} - 缺失`);
  }
});

// 检查 railway.json 内容
console.log('\n📄 railway.json 内容:');
const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
console.log(JSON.stringify(railwayConfig, null, 2));

// 检查 backend/package.json 的 start 脚本
console.log('\n📄 backend/package.json start 脚本:');
const packageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
console.log(`  "start": "${packageJson.scripts.start}"`);

// 检查 backend/server.js 的端口配置
console.log('\n📄 backend/server.js 端口配置:');
const serverContent = fs.readFileSync('backend/server.js', 'utf8');
const portMatch = serverContent.match(/const PORT = process\.env\.PORT \|\| (\d+);/);
if (portMatch) {
  console.log(`  端口: ${portMatch[1]}`);
} else {
  console.log('  ⚠️  未找到端口配置');
}

// 生成重新部署指南
console.log('\n🔧 Railway 重新部署指南:');
console.log('1. 登录 Railway Dashboard');
console.log('2. 找到 ticketing-ai 项目');
console.log('3. 进入 Settings > General');
console.log('4. 确认 Root Directory 设置为 "backend"');
console.log('5. 如果没有设置，手动设置为 "backend"');
console.log('6. 进入 Variables 页面');
console.log('7. 添加以下环境变量:');
console.log('   - NODE_ENV=production');
console.log('   - PORT=8080');
console.log('   - SUPABASE_URL=你的 Supabase URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY=你的服务角色密钥');
console.log('   - JWT_SECRET=你的 JWT 密钥');
console.log('   - STRIPE_SECRET_KEY=你的 Stripe 密钥');
console.log('   - CORS_ORIGIN=https://你的前端域名.vercel.app');
console.log('8. 点击 "Redeploy" 重新部署');
console.log('9. 等待部署完成');
console.log('10. 测试 https://ticketing-ai-production.up.railway.app/health');

console.log('\n📝 如果 Root Directory 设置正确但仍然部署前端:');
console.log('1. 删除当前 Railway 项目');
console.log('2. 重新创建项目');
console.log('3. 选择 "Deploy from GitHub repo"');
console.log('4. 选择 ticketing-ai 仓库');
console.log('5. 在 Root Directory 中设置 "backend"');
console.log('6. 配置环境变量');
console.log('7. 部署');

console.log('\n✅ 重新部署准备完成');
