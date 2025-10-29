#!/usr/bin/env node

/**
 * 测试修复效果脚本
 * 验证loading状态和日期格式修复
 */

const https = require('https');

console.log('🧪 测试修复效果...\n');

async function testFixes() {
  try {
    // 1. 测试Events API
    console.log('1️⃣ 测试Events API...');
    const eventsResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events');
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log('   ✅ API响应正常');
      console.log(`   📊 活动数量: ${eventsData.data?.length || 0}`);
      
      if (eventsData.data && eventsData.data.length > 0) {
        const event = eventsData.data[0];
        console.log('   📋 示例活动数据:');
        console.log(`      标题: ${event.title}`);
        console.log(`      开始时间: ${event.start_at}`);
        console.log(`      状态: ${event.status}`);
        console.log(`      价格数量: ${event.prices?.length || 0}`);
      }
    } else {
      console.log(`   ❌ API错误: ${eventsResponse.status}`);
    }
    console.log('');

    // 2. 测试Events页面
    console.log('2️⃣ 测试Events页面...');
    const pageResponse = await fetch('https://ticketing-ai-six.vercel.app/events');
    
    if (pageResponse.ok) {
      const pageContent = await pageResponse.text();
      console.log('   ✅ 页面加载正常');
      console.log(`   📏 页面大小: ${pageContent.length} 字符`);
      
      // 检查是否还有loading状态
      if (pageContent.includes('loading...')) {
        console.log('   ⚠️ 仍然发现loading状态');
      } else {
        console.log('   ✅ 没有发现loading状态');
      }
      
      // 检查是否还有Invalid Date
      if (pageContent.includes('Invalid Date')) {
        console.log('   ⚠️ 仍然发现Invalid Date');
      } else {
        console.log('   ✅ 没有发现Invalid Date');
      }
      
      // 检查是否有活动数据
      if (pageContent.includes('Amazing Events')) {
        console.log('   ✅ 页面标题正常显示');
      }
      
      // 检查是否有活动卡片
      if (pageContent.includes('EventCard') || pageContent.includes('event-card')) {
        console.log('   ✅ 发现活动卡片组件');
      }
    } else {
      console.log(`   ❌ 页面错误: ${pageResponse.status}`);
    }
    console.log('');

    // 3. 测试主页
    console.log('3️⃣ 测试主页...');
    const homeResponse = await fetch('https://ticketing-ai-six.vercel.app/');
    
    if (homeResponse.ok) {
      const homeContent = await homeResponse.text();
      console.log('   ✅ 主页加载正常');
      
      if (homeContent.includes('loading...')) {
        console.log('   ⚠️ 主页仍有loading状态');
      } else {
        console.log('   ✅ 主页没有loading状态');
      }
    } else {
      console.log(`   ❌ 主页错误: ${homeResponse.status}`);
    }
    console.log('');

    // 4. 总结
    console.log('4️⃣ 修复效果总结:');
    console.log('   🔧 已修复的问题:');
    console.log('      - 改进了useEvents hook的错误处理');
    console.log('      - 添加了日期格式化功能');
    console.log('      - 优化了loading状态管理');
    console.log('      - 更新了EventCard组件显示');
    console.log('');
    console.log('   📋 建议下一步:');
    console.log('      1. 重新部署到Vercel');
    console.log('      2. 清除浏览器缓存');
    console.log('      3. 测试页面加载速度');
    console.log('      4. 验证活动数据正确显示');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
testFixes();
