#!/usr/bin/env node

/**
 * 测试事件更新功能
 * 验证默认活动更新是否正常工作
 */

const https = require('https');

console.log('🧪 测试事件更新功能...\n');

async function testEventUpdate() {
  try {
    // 1. 测试获取默认活动
    console.log('1️⃣ 测试获取默认活动...');
    const getResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events/ridiculous-chicken');
    
    if (getResponse.ok) {
      const eventData = await getResponse.json();
      console.log('   ✅ 获取默认活动成功');
      console.log(`   📋 活动标题: ${eventData.data?.title}`);
      console.log(`   📅 开始时间: ${eventData.data?.start_at}`);
      console.log(`   📍 地点: ${eventData.data?.location}`);
      console.log(`   🎫 价格数量: ${eventData.data?.prices?.length || 0}`);
    } else {
      console.log(`   ❌ 获取默认活动失败: ${getResponse.status}`);
    }
    console.log('');

    // 2. 测试更新默认活动
    console.log('2️⃣ 测试更新默认活动...');
    const updateData = {
      title: 'Ridiculous Chicken Night Event - Updated',
      description: 'Updated description for the amazing chicken event',
      startTime: '2025-10-25T20:00:00Z',
      endTime: '2025-10-25T23:00:00Z',
      location: 'Updated Location - Shanghai Concert Hall',
      status: 'published',
      prices: [
        {
          name: 'Regular Ticket (21+)',
          amount_cents: 1500,
          inventory: 100,
          limit_per_user: 5
        },
        {
          name: 'Special Ticket (18-20)',
          amount_cents: 3000,
          inventory: 50,
          limit_per_user: 2
        }
      ]
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
      console.log(`   📋 更新后标题: ${updateResult.data?.title}`);
      console.log(`   📍 更新后地点: ${updateResult.data?.location}`);
      console.log(`   💬 消息: ${updateResult.message}`);
    } else {
      const errorData = await updateResponse.json();
      console.log(`   ❌ 更新默认活动失败: ${updateResponse.status}`);
      console.log(`   🔍 错误信息: ${errorData.error || 'Unknown error'}`);
      console.log(`   💬 消息: ${errorData.message || 'No message'}`);
    }
    console.log('');

    // 3. 测试更新真实活动（如果存在）
    console.log('3️⃣ 测试更新真实活动...');
    const eventsResponse = await fetch('https://ticketing-ai-six.vercel.app/api/events');
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const realEvents = eventsData.data?.filter(event => event.id !== 'ridiculous-chicken') || [];
      
      if (realEvents.length > 0) {
        const realEvent = realEvents[0];
        console.log(`   📋 找到真实活动: ${realEvent.title}`);
        
        const realUpdateData = {
          title: realEvent.title + ' - Updated',
          description: realEvent.description + ' (Updated)',
          startTime: realEvent.start_at,
          endTime: realEvent.end_at,
          location: realEvent.address || realEvent.location,
          status: realEvent.status
        };

        const realUpdateResponse = await fetch(`https://ticketing-ai-six.vercel.app/api/events/${realEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(realUpdateData)
        });

        if (realUpdateResponse.ok) {
          console.log('   ✅ 更新真实活动成功');
        } else {
          const errorData = await realUpdateResponse.json();
          console.log(`   ❌ 更新真实活动失败: ${realUpdateResponse.status}`);
          console.log(`   🔍 错误信息: ${errorData.error || 'Unknown error'}`);
        }
      } else {
        console.log('   ℹ️ 没有找到真实活动进行测试');
      }
    } else {
      console.log('   ❌ 无法获取活动列表');
    }
    console.log('');

    // 4. 总结
    console.log('4️⃣ 测试总结:');
    console.log('   🔧 已修复的问题:');
    console.log('      - 添加了对ridiculous-chicken特殊ID的处理');
    console.log('      - 修复了管理员界面的字段映射问题');
    console.log('      - 改进了错误处理和响应消息');
    console.log('      - 添加了价格更新功能');
    console.log('');
    console.log('   📋 建议下一步:');
    console.log('      1. 重新部署到Vercel');
    console.log('      2. 测试管理员界面的编辑功能');
    console.log('      3. 验证默认活动可以正常编辑');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
testEventUpdate();
