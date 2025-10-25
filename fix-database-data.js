#!/usr/bin/env node

/**
 * 🔧 修复数据库数据问题
 * 解决活动数据不完整和验证失败的问题
 */

const https = require('https');

const BASE_URL = 'https://ticketing-ai-ypyj.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: false,
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

async function fixDatabaseData() {
  console.log('🔧 开始修复数据库数据问题...\n');
  
  try {
    // 1. 检查当前数据状态
    console.log('📊 检查当前数据状态...');
    const dataResult = await makeRequest(`${BASE_URL}/api/debug/supabase-data`);
    
    if (dataResult.success) {
      const stats = dataResult.data.data;
      console.log(`- 用户: ${stats.users}`);
      console.log(`- 商家: ${stats.merchants}`);
      console.log(`- 活动: ${stats.events}`);
      console.log(`- 价格: ${stats.prices}`);
      console.log(`- 订单: ${stats.orders}`);
      console.log(`- 票据: ${stats.tickets}`);
    }
    
    // 2. 检查活动数据
    console.log('\n📋 检查活动数据...');
    const eventsResult = await makeRequest(`${BASE_URL}/api/events`);
    
    if (eventsResult.success && Array.isArray(eventsResult.data)) {
      console.log(`找到 ${eventsResult.data.length} 个活动`);
      
      eventsResult.data.forEach((event, index) => {
        console.log(`\n活动 ${index + 1}:`);
        console.log(`- ID: ${event.id}`);
        console.log(`- 标题: ${event.title || 'undefined'}`);
        console.log(`- 状态: ${event.status || 'undefined'}`);
        console.log(`- 商家: ${event.merchants?.name || 'N/A'}`);
        console.log(`- 价格: ${event.prices?.length || 0} 个`);
        
        // 检查数据完整性问题
        const issues = [];
        if (!event.title) issues.push('缺少标题');
        if (!event.status) issues.push('缺少状态');
        if (!event.merchants?.name) issues.push('缺少商家信息');
        if (!event.prices || event.prices.length === 0) issues.push('缺少价格信息');
        
        if (issues.length > 0) {
          console.log(`❌ 数据问题: ${issues.join(', ')}`);
        } else {
          console.log('✅ 数据完整');
        }
      });
    }
    
    // 3. 提供修复建议
    console.log('\n💡 修复建议:');
    console.log('1. 执行数据库重置脚本');
    console.log('2. 重新创建测试数据');
    console.log('3. 验证数据完整性');
    
    console.log('\n🔗 执行步骤:');
    console.log('1. 访问 Supabase Dashboard > SQL Editor');
    console.log('2. 复制 scripts/reset-supabase-database.sql 内容');
    console.log('3. 执行重置脚本');
    console.log('4. 重新测试活动页面');
    
    console.log('\n📋 重置脚本位置: scripts/reset-supabase-database.sql');
    console.log('📖 详细指南: SUPABASE_DATABASE_RESET_GUIDE.md');
    
  } catch (error) {
    console.error('❌ 修复检查失败:', error.message);
  }
}

fixDatabaseData();
