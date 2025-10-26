#!/usr/bin/env node

/**
 * 🔧 活动页面和二维码问题修复工具
 * 直接运行诊断和修复功能
 */

const https = require('https');
const http = require('http');

// 配置
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ticketing-ai-ypyj.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

// 修复功能列表
const fixes = [
  {
    id: 'test-database-connection',
    name: '测试数据库连接',
    description: '测试Supabase数据库连接和表结构',
    endpoint: '/api/debug/supabase-test'
  },
  {
    id: 'test-supabase-tables',
    name: '测试数据库表',
    description: '检查必需的数据库表结构',
    endpoint: '/api/debug/supabase-tables'
  },
  {
    id: 'test-supabase-data',
    name: '测试数据库数据',
    description: '检查数据库中的数据',
    endpoint: '/api/debug/supabase-data'
  },
  {
    id: 'test-events-api',
    name: '测试活动API',
    description: '测试活动数据获取API',
    endpoint: '/api/events'
  },
  {
    id: 'test-event-detail',
    name: '测试活动详情',
    description: '测试特定活动详情页面',
    endpoint: '/api/events/ridiculous-chicken'
  }
];

// HTTP请求函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: data,
            error: error.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// 运行单个修复
async function runFix(fix, baseUrl) {
  console.log(`\n🔧 运行修复: ${fix.name}`);
  console.log(`📝 描述: ${fix.description}`);
  console.log(`🌐 端点: ${baseUrl}${fix.endpoint}`);
  
  try {
    const result = await makeRequest(`${baseUrl}${fix.endpoint}`);
    
    if (result.success) {
      console.log(`✅ 成功: ${result.data.message || '请求成功'}`);
      if (result.data.details) {
        console.log(`📊 详情: ${JSON.stringify(result.data.details, null, 2)}`);
      }
    } else {
      console.log(`❌ 失败: HTTP ${result.status}`);
      console.log(`📄 响应: ${JSON.stringify(result.data, null, 2)}`);
    }
    
    return {
      id: fix.id,
      name: fix.name,
      success: result.success,
      status: result.status,
      message: result.data.message || result.data.error || 'Unknown error',
      details: result.data.details || result.data
    };
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
    return {
      id: fix.id,
      name: fix.name,
      success: false,
      error: error.message
    };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始运行活动页面和二维码问题修复工具');
  console.log(`🌐 基础URL: ${BASE_URL}`);
  
  const results = [];
  
  // 尝试本地服务器
  console.log('\n📍 尝试连接本地服务器...');
  try {
    await makeRequest(`${LOCAL_URL}/api/events`);
    console.log('✅ 本地服务器运行中，使用本地URL');
    var baseUrl = LOCAL_URL;
  } catch (error) {
    console.log('❌ 本地服务器未运行，使用生产URL');
    var baseUrl = BASE_URL;
  }
  
  // 运行所有修复
  for (const fix of fixes) {
    const result = await runFix(fix, baseUrl);
    results.push(result);
    
    // 添加延迟避免过快请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 显示结果摘要
  console.log('\n📊 修复结果摘要:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ 成功: ${successful.length}/${results.length}`);
  console.log(`❌ 失败: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ 成功的修复:');
    successful.forEach(result => {
      console.log(`  - ${result.name}: ${result.message}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ 失败的修复:');
    failed.forEach(result => {
      console.log(`  - ${result.name}: ${result.error || result.message}`);
    });
  }
  
  // 提供建议
  console.log('\n💡 建议:');
  if (failed.length > 0) {
    console.log('1. 检查Supabase环境变量配置');
    console.log('2. 访问 /debug-supabase-config 进行详细诊断');
    console.log('3. 考虑执行数据库重置脚本');
  } else {
    console.log('1. 所有测试通过，问题可能已解决');
    console.log('2. 尝试访问活动页面测试功能');
    console.log('3. 测试完整的购买流程');
  }
  
  console.log('\n🔗 有用的链接:');
  console.log(`- 修复工具页面: ${baseUrl}/fix-event-and-qr-issues`);
  console.log(`- Supabase配置诊断: ${baseUrl}/debug-supabase-config`);
  console.log(`- 数据库状态诊断: ${baseUrl}/debug-db-status`);
  console.log(`- 测试活动页面: ${baseUrl}/events/ridiculous-chicken`);
}

// 运行主函数
main().catch(error => {
  console.error('❌ 修复工具运行失败:', error.message);
  process.exit(1);
});

