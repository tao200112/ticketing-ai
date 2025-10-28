#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🧪 全面功能测试开始...\n');

// 配置
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ticketing-ai-ypyj-810szz22m-taoliu0711-7515s-projects.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://ticketing-ai-production.up.railway.app';

// 测试函数
async function testEndpoint(url, description, expectedStatus = 200) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === expectedStatus;
        console.log(`  ${success ? '✅' : '❌'} ${description} - 状态: ${res.statusCode}`);
        if (!success) {
          console.log(`    期望状态: ${expectedStatus}, 实际状态: ${res.statusCode}`);
        }
        resolve({ success, status: res.statusCode, data });
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
    { url: `${BACKEND_URL}/health`, desc: '基础健康检查', expectedStatus: 200 },
    { url: `${BACKEND_URL}/v1/health`, desc: 'API 健康检查', expectedStatus: 200 },
    { url: `${BACKEND_URL}/v1/events`, desc: '获取活动列表', expectedStatus: 200 }
  ];
  
  let passed = 0;
  for (const test of tests) {
    const result = await testEndpoint(test.url, test.desc, test.expectedStatus);
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
    { url: `${FRONTEND_URL}/auth/login`, desc: '登录页面' },
    { url: `${FRONTEND_URL}/auth/register`, desc: '注册页面' },
    { url: `${FRONTEND_URL}/events`, desc: '活动页面' },
    { url: `${FRONTEND_URL}/account`, desc: '账户页面' },
    { url: `${FRONTEND_URL}/merchant`, desc: '商家页面' },
    { url: `${FRONTEND_URL}/admin`, desc: '管理员页面' }
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

// 功能测试总结
function printFeatureTestSummary() {
  console.log('📋 功能测试清单:');
  console.log('\n👤 客户功能:');
  console.log('  □ 用户注册');
  console.log('  □ 用户登录');
  console.log('  □ 浏览活动');
  console.log('  □ 购买票务');
  console.log('  □ 支付功能');
  console.log('  □ 查看购票数据');
  console.log('  □ 扫描二维码验证票务');
  
  console.log('\n🏢 商家功能:');
  console.log('  □ 商家注册');
  console.log('  □ 商家登录');
  console.log('  □ 发布活动');
  console.log('  □ 活动介绍编辑');
  console.log('  □ 定价设置');
  console.log('  □ 海报上传');
  console.log('  □ 查看售票信息');
  
  console.log('\n👨‍💼 管理员功能:');
  console.log('  □ 查看客户信息');
  console.log('  □ 查看商家信息');
  console.log('  □ 查看购票信息');
  console.log('  □ 创建活动');
  console.log('  □ 编辑现有活动');
  console.log('  □ 生成商家邀请码');
  console.log('  □ 管理商家注册');
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始全面功能测试...\n');
  
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
  
  // 打印功能测试清单
  printFeatureTestSummary();
  
  // 总结
  console.log('\n📊 测试总结:');
  console.log(`  ${results.env ? '✅' : '❌'} 环境变量配置`);
  console.log(`  ${results.backend ? '✅' : '❌'} 后端服务`);
  console.log(`  ${results.frontend ? '✅' : '❌'} 前端页面`);
  console.log(`  ${results.integration ? '✅' : '❌'} API 集成`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有基础测试通过！');
    console.log('📝 接下来需要手动测试具体功能：');
    console.log('  1. 用户注册和登录流程');
    console.log('  2. 活动浏览和票务购买');
    console.log('  3. 支付功能测试');
    console.log('  4. 商家功能测试');
    console.log('  5. 管理员功能测试');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关配置。');
    console.log('\n🔧 建议修复步骤:');
    if (!results.env) console.log('   1. 检查 Vercel 环境变量配置');
    if (!results.backend) console.log('   2. 检查 Railway 后端服务状态');
    if (!results.frontend) console.log('   3. 检查 Vercel 前端部署状态');
    if (!results.integration) console.log('   4. 检查前后端 API 集成');
  }
  
  return allPassed;
}

// 运行测试
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllTests, testEndpoint };
