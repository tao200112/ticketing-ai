#!/usr/bin/env node

const testEventsAPI = async () => {
  console.log('🔍 测试活动API问题\n');

  try {
    // 测试活动API
    console.log('📋 测试活动API...');
    const eventsResponse = await fetch('http://localhost:3000/api/events');
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ 活动API响应:', events.length, '个活动');
      if (events.length > 0) {
        console.log('📋 第一个活动:', JSON.stringify(events[0], null, 2));
      }
    } else {
      console.log('❌ 活动API失败:', eventsResponse.status);
    }

    // 测试管理员活动API
    console.log('\n🏢 测试管理员活动API...');
    const adminEventsResponse = await fetch('http://localhost:3000/api/admin/events');
    if (adminEventsResponse.ok) {
      const adminEvents = await adminEventsResponse.json();
      console.log('✅ 管理员活动API响应:', adminEvents.length, '个活动');
      if (adminEvents.length > 0) {
        console.log('📋 第一个活动:', JSON.stringify(adminEvents[0], null, 2));
      }
    } else {
      console.log('❌ 管理员活动API失败:', adminEventsResponse.status);
    }

    // 比较两个API的差异
    console.log('\n🔍 分析差异...');
    if (eventsResponse.ok && adminEventsResponse.ok) {
      const events = await eventsResponse.json();
      const adminEvents = await adminEventsResponse.json();
      console.log('📊 活动API返回:', events.length, '个活动');
      console.log('📊 管理员活动API返回:', adminEvents.length, '个活动');
      
      if (events.length === 0 && adminEvents.length > 0) {
        console.log('❌ 问题确认: 活动API返回空数组，但管理员API有数据');
        console.log('🔧 可能原因: 权限问题或查询条件问题');
      }
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testEventsAPI();
