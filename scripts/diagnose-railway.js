#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 Railway 后端诊断开始...\n');

const BACKEND_URL = 'https://ticketing-ai-production.up.railway.app';

// 测试函数
async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📡 ${description}`);
        console.log(`   状态码: ${res.statusCode}`);
        console.log(`   响应头: ${JSON.stringify(res.headers, null, 2)}`);
        if (data) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`   响应数据: ${JSON.stringify(jsonData, null, 2)}`);
          } catch (e) {
            console.log(`   响应数据: ${data.substring(0, 200)}...`);
          }
        }
        console.log('');
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${description} - 错误: ${error.message}\n`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(15000, () => {
      console.log(`⏰ ${description} - 超时\n`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// 诊断函数
async function diagnoseRailway() {
  console.log('🚀 开始 Railway 后端诊断...\n');
  
  // 测试基础健康检查
  await testEndpoint(`${BACKEND_URL}/health`, '基础健康检查');
  
  // 测试 API 健康检查
  await testEndpoint(`${BACKEND_URL}/v1/health`, 'API 健康检查');
  
  // 测试根路径
  await testEndpoint(`${BACKEND_URL}/`, '根路径');
  
  // 测试活动 API
  await testEndpoint(`${BACKEND_URL}/v1/events`, '活动 API');
  
  console.log('📋 Railway 诊断建议:');
  console.log('1. 检查 Railway Dashboard 中的部署日志');
  console.log('2. 确认环境变量已正确配置');
  console.log('3. 检查服务是否正在运行');
  console.log('4. 确认端口配置正确 (应该是 8080)');
  console.log('5. 检查 Supabase 连接是否正常');
  
  console.log('\n🔧 必需的环境变量:');
  console.log('- NODE_ENV=production');
  console.log('- PORT=8080');
  console.log('- SUPABASE_URL=https://your-project.supabase.co');
  console.log('- SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('- JWT_SECRET=your-production-jwt-secret');
  console.log('- STRIPE_SECRET_KEY=sk_live_your-secret-key');
  console.log('- CORS_ORIGIN=https://your-frontend-domain.vercel.app');
}

// 运行诊断
if (require.main === module) {
  diagnoseRailway().then(() => {
    console.log('✅ Railway 诊断完成');
  });
}

module.exports = { diagnoseRailway, testEndpoint };
