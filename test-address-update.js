#!/usr/bin/env node

/**
 * 测试地址更新效果
 * 验证默认活动地址是否正确更新
 */

const https = require('https');

console.log('🧪 测试地址更新效果...\n');

async function testAddressUpdate() {
  try {
    // 1. 测试获取默认活动
    console.log('1️⃣ 测试获取默认活动...');
    const getResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events/ridiculous-chicken');
    
    if (getResponse.ok) {
      const eventData = await getResponse.json();
      console.log('   ✅ 获取默认活动成功');
      console.log(`   📋 活动标题: ${eventData.data?.title}`);
      console.log(`   📍 活动地址: ${eventData.data?.location}`);
      console.log(`   🏢 详细地址: ${eventData.data?.address}`);
      
      // 检查地址是否正确更新
      const expectedAddress = '201 N Main St SUITE A, Blacksburg, VA 24060';
      if (eventData.data?.location === expectedAddress) {
        console.log('   ✅ 地址更新成功！');
      } else {
        console.log(`   ❌ 地址未更新，当前: ${eventData.data?.location}`);
        console.log(`   📋 期望地址: ${expectedAddress}`);
      }
    } else {
      console.log(`   ❌ 获取默认活动失败: ${getResponse.status}`);
    }
    console.log('');

    // 2. 测试更新默认活动地址
    console.log('2️⃣ 测试更新默认活动地址...');
    const updateData = {
      title: 'Ridiculous Chicken Night Event',
      description: 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event.',
      startTime: '2025-10-25T20:00:00Z',
      endTime: '2025-10-25T23:00:00Z',
      location: '201 N Main St SUITE A, Blacksburg, VA 24060',
      status: 'published'
    };

    const updateResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events/ridiculous-chicken', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('   ✅ 更新默认活动成功');
      console.log(`   📍 更新后地址: ${updateResult.data?.location}`);
      console.log(`   🏢 更新后详细地址: ${updateResult.data?.address}`);
    } else {
      const errorData = await updateResponse.json();
      console.log(`   ❌ 更新默认活动失败: ${updateResponse.status}`);
      console.log(`   🔍 错误信息: ${errorData.error || 'Unknown error'}`);
    }
    console.log('');

    // 3. 测试主页显示
    console.log('3️⃣ 测试主页显示...');
    const homeResponse = await fetch('https://ticketing-ai-six.vercel.app/');
    
    if (homeResponse.ok) {
      const homeContent = await homeResponse.text();
      console.log('   ✅ 主页加载成功');
      
      // 检查页面中是否包含新地址
      if (homeContent.includes('201 N Main St SUITE A, Blacksburg, VA 24060')) {
        console.log('   ✅ 主页显示新地址');
      } else if (homeContent.includes('Shanghai Concert Hall')) {
        console.log('   ⚠️ 主页仍显示旧地址');
      } else {
        console.log('   ℹ️ 主页中未找到地址信息');
      }
    } else {
      console.log(`   ❌ 主页加载失败: ${homeResponse.status}`);
    }
    console.log('');

    // 4. 测试活动详情页
    console.log('4️⃣ 测试活动详情页...');
    const eventPageResponse = await fetch('https://ticketing-ai-six.vercel.app/events/ridiculous-chicken');
    
    if (eventPageResponse.ok) {
      const eventPageContent = await eventPageResponse.text();
      console.log('   ✅ 活动详情页加载成功');
      
      // 检查页面中是否包含新地址
      if (eventPageContent.includes('201 N Main St SUITE A, Blacksburg, VA 24060')) {
        console.log('   ✅ 活动详情页显示新地址');
      } else if (eventPageContent.includes('Shanghai Concert Hall')) {
        console.log('   ⚠️ 活动详情页仍显示旧地址');
      } else {
        console.log('   ℹ️ 活动详情页中未找到地址信息');
      }
    } else {
      console.log(`   ❌ 活动详情页加载失败: ${eventPageResponse.status}`);
    }
    console.log('');

    // 5. 总结
    console.log('5️⃣ 地址更新总结:');
    console.log('   🔧 已更新的文件:');
    console.log('      - app/api/events/[id]/route.js (GET和PUT方法)');
    console.log('      - app/admin/dashboard/page.js (管理员界面)');
    console.log('      - app/events/ridiculous-chicken/page.js (活动详情页)');
    console.log('      - lib/default-events.js (默认活动配置)');
    console.log('');
    console.log('   📍 新地址: 201 N Main St SUITE A, Blacksburg, VA 24060');
    console.log('   📋 建议下一步:');
    console.log('      1. 重新部署到Vercel');
    console.log('      2. 清除浏览器缓存');
    console.log('      3. 测试所有页面的地址显示');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
testAddressUpdate();
