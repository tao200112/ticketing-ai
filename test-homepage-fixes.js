#!/usr/bin/env node

/**
 * 测试主页修复效果
 * 验证活动信息更新和卡片显示
 */

const https = require('https');

console.log('🧪 测试主页修复效果...\n');

async function testHomepageFixes() {
  try {
    // 1. 测试主页加载
    console.log('1️⃣ 测试主页加载...');
    const homeResponse = await fetch('https://ticketing-ai-six.vercel.app/');
    
    if (homeResponse.ok) {
      const homeContent = await homeResponse.text();
      console.log('   ✅ 主页加载成功');
      console.log(`   📏 页面大小: ${homeContent.length} 字符`);
      
      // 检查是否还有loading状态
      if (homeContent.includes('loading...')) {
        console.log('   ⚠️ 仍然发现loading状态');
      } else {
        console.log('   ✅ 没有发现loading状态');
      }
      
      // 检查是否还有Invalid Date
      if (homeContent.includes('Invalid Date')) {
        console.log('   ⚠️ 仍然发现Invalid Date');
      } else {
        console.log('   ✅ 没有发现Invalid Date');
      }
      
      // 检查是否有活动卡片
      if (homeContent.includes('EventCard') || homeContent.includes('event-card')) {
        console.log('   ✅ 发现活动卡片组件');
      }
      
      // 检查是否还有票数量显示
      if (homeContent.includes('sold') || homeContent.includes('🎫')) {
        console.log('   ⚠️ 仍然发现票数量显示');
      } else {
        console.log('   ✅ 没有发现票数量显示');
      }
    } else {
      console.log(`   ❌ 主页加载失败: ${homeResponse.status}`);
    }
    console.log('');

    // 2. 测试Events页面
    console.log('2️⃣ 测试Events页面...');
    const eventsResponse = await fetch('https://ticketing-ai-six.vercel.app/events');
    
    if (eventsResponse.ok) {
      const eventsContent = await eventsResponse.text();
      console.log('   ✅ Events页面加载成功');
      console.log(`   📏 页面大小: ${eventsContent.length} 字符`);
      
      // 检查票数量显示
      if (eventsContent.includes('sold') || eventsContent.includes('🎫')) {
        console.log('   ⚠️ Events页面仍有票数量显示');
      } else {
        console.log('   ✅ Events页面没有票数量显示');
      }
    } else {
      console.log(`   ❌ Events页面加载失败: ${eventsResponse.status}`);
    }
    console.log('');

    // 3. 测试API数据
    console.log('3️⃣ 测试API数据...');
    const apiResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events');
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log('   ✅ API响应正常');
      console.log(`   📊 活动数量: ${apiData.data?.length || 0}`);
      
      if (apiData.data && apiData.data.length > 0) {
        const event = apiData.data[0];
        console.log('   📋 示例活动数据:');
        console.log(`      标题: ${event.title}`);
        console.log(`      开始时间: ${event.start_at}`);
        console.log(`      地点: ${event.address || event.location}`);
        console.log(`      价格数量: ${event.prices?.length || 0}`);
      }
    } else {
      console.log(`   ❌ API响应失败: ${apiResponse.status}`);
    }
    console.log('');

    // 4. 总结
    console.log('4️⃣ 修复效果总结:');
    console.log('   🔧 已修复的问题:');
    console.log('      - 移除了活动卡片中的票数量显示');
    console.log('      - 改进了主页活动数据更新机制');
    console.log('      - 添加了页面可见性变化监听');
    console.log('      - 优化了数据依赖项管理');
    console.log('');
    console.log('   📋 建议下一步:');
    console.log('      1. 重新部署到Vercel');
    console.log('      2. 清除浏览器缓存');
    console.log('      3. 测试页面切换时的数据更新');
    console.log('      4. 验证活动卡片显示效果');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
testHomepageFixes();
