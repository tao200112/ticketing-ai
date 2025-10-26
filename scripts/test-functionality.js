#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🧪 测试应用功能...\n');

// 配置
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// 测试函数
async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✅ ${description} - 状态: ${res.statusCode}`);
          resolve({ success: true, status: res.statusCode, data });
        } else {
          console.log(`  ❌ ${description} - 状态: ${res.statusCode}`);
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ ${description} - 错误: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      console.log(`  ⏰ ${description} - 超时`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// 测试后端 API
async function testBackendAPI() {
  console.log('🔧 测试后端 API:');
  
  const tests = [
    { url: `${BACKEND_URL}/health`, desc: '健康检查' },
    { url: `${BACKEND_URL}/v1/health`, desc: 'API 健康检查' },
    { url: `${BACKEND_URL}/v1/events`, desc: '获取活动列表' }
  ];
  
  let passed = 0;
  for (const test of tests) {
    const result = await testEndpoint(test.url, test.desc);
    if (result.success) passed++;
  }
  
  console.log(`\n📊 后端 API 测试结果: ${passed}/${tests.length} 通过\n`);
  return passed === tests.length;
}

// 测试前端页面
async function testFrontendPages() {
  console.log('🌐 测试前端页面:');
  
  const tests = [
    { url: `${FRONTEND_URL}/`, desc: '首页' },
    { url: `${FRONTEND_URL}/events`, desc: '活动页面' },
    { url: `${FRONTEND_URL}/auth/login`, desc: '登录页面' }
  ];
  
  let passed = 0;
  for (const test of tests) {
    const result = await testEndpoint(test.url, test.desc);
    if (result.success) passed++;
  }
  
  console.log(`\n📊 前端页面测试结果: ${passed}/${tests.length} 通过\n`);
  return passed === tests.length;
}

// 测试 API 集成
async function testAPIIntegration() {
  console.log('🔌 测试 API 集成:');
  
  try {
    // 测试活动 API
    const eventsResult = await testEndpoint(`${BACKEND_URL}/v1/events`, '活动 API 集成');
    
    if (eventsResult.success) {
      try {
        const data = JSON.parse(eventsResult.data);
        if (data.success && Array.isArray(data.data)) {
          console.log(`  ✅ 活动 API 返回正确格式 - 活动数量: ${data.data.length}`);
        } else {
          console.log(`  ⚠️  活动 API 返回格式异常`);
        }
      } catch (e) {
        console.log(`  ⚠️  活动 API 返回数据解析失败`);
      }
    }
    
    return eventsResult.success;
  } catch (error) {
    console.log(`  ❌ API 集成测试失败: ${error.message}`);
    return false;
  }
}

// 测试环境变量
function testEnvironmentVariables() {
  console.log('🔧 检查环境变量:');
  
  const requiredVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let missing = 0;
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} - 已设置`);
    } else {
      console.log(`  ❌ ${varName} - 未设置`);
      missing++;
    }
  });
  
  console.log(`\n📊 环境变量检查结果: ${requiredVars.length - missing}/${requiredVars.length} 已设置\n`);
  return missing === 0;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始功能测试...\n');
  
  const results = {
    backend: false,
    frontend: false,
    integration: false,
    env: false
  };
  
  // 测试环境变量
  results.env = testEnvironmentVariables();
  
  // 测试后端
  results.backend = await testBackendAPI();
  
  // 测试前端
  results.frontend = await testFrontendPages();
  
  // 测试集成
  results.integration = await testAPIIntegration();
  
  // 总结
  console.log('📊 测试总结:');
  console.log(`  ${results.env ? '✅' : '❌'} 环境变量配置`);
  console.log(`  ${results.backend ? '✅' : '❌'} 后端服务`);
  console.log(`  ${results.frontend ? '✅' : '❌'} 前端页面`);
  console.log(`  ${results.integration ? '✅' : '❌'} API 集成`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有功能测试通过！应用可以正常运行。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关配置。');
  }
  
  return allPassed;
}

// 运行测试
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests, testEndpoint };
