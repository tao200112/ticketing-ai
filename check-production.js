#!/usr/bin/env node

/**
 * 生产环境检查脚本
 * 检查Vercel部署的网站状态
 */

const https = require('https');

console.log('🔍 检查生产环境网站状态...\n');

async function checkProductionSite() {
  try {
    // 1. 检查主页
    console.log('1️⃣ 检查主页...');
    const homeResponse = await fetch('https://ticketing-ai-six.vercel.app/');
    console.log(`   状态码: ${homeResponse.status}`);
    console.log(`   状态: ${homeResponse.ok ? '✅ 正常' : '❌ 异常'}\n`);

    // 2. 检查Events API
    console.log('2️⃣ 检查Events API...');
    const eventsResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events');
    console.log(`   状态码: ${eventsResponse.status}`);
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log(`   响应: ${JSON.stringify(eventsData, null, 2)}`);
      console.log(`   活动数量: ${eventsData.data?.length || 0}`);
    } else {
      console.log(`   ❌ API错误: ${eventsResponse.statusText}`);
    }
    console.log('');

    // 3. 检查Events页面
    console.log('3️⃣ 检查Events页面...');
    const eventsPageResponse = await fetch('https://ticketing-ai-six.vercel.app/events');
    console.log(`   状态码: ${eventsPageResponse.status}`);
    console.log(`   状态: ${eventsPageResponse.ok ? '✅ 正常' : '❌ 异常'}`);
    
    if (eventsPageResponse.ok) {
      const pageContent = await eventsPageResponse.text();
      console.log(`   页面大小: ${pageContent.length} 字符`);
      
      // 检查是否有loading状态
      if (pageContent.includes('loading...')) {
        console.log('   ⚠️ 发现loading状态，可能数据未完全加载');
      }
      
      // 检查是否有Invalid Date
      if (pageContent.includes('Invalid Date')) {
        console.log('   ⚠️ 发现Invalid Date，日期格式可能有问题');
      }
    }
    console.log('');

    // 4. 检查其他API端点
    console.log('4️⃣ 检查其他API端点...');
    const apiEndpoints = [
      '/api/hello',
      '/api/admin/stats',
      '/api/admin/events'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`https://ticketing-ai-six.vercel.app${endpoint}`);
        console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${endpoint}: ❌ 错误 - ${error.message}`);
      }
    }

    console.log('\n🎉 生产环境检查完成！');

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 执行检查
checkProductionSite();
