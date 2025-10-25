#!/usr/bin/env node

const debugEventsAPI = async () => {
  console.log('🔍 调试活动API问题\n');

  try {
    // 测试活动API
    console.log('📋 测试活动API...');
    const eventsResponse = await fetch('http://localhost:3000/api/events');
    console.log('📊 响应状态:', eventsResponse.status);
    
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ 活动API响应:', events);
      console.log('📊 活动数量:', events.length);
    } else {
      const errorText = await eventsResponse.text();
      console.log('❌ 活动API失败:', eventsResponse.status, errorText);
    }

    // 测试管理员活动API
    console.log('\n🏢 测试管理员活动API...');
    const adminEventsResponse = await fetch('http://localhost:3000/api/admin/events');
    console.log('📊 响应状态:', adminEventsResponse.status);
    
    if (adminEventsResponse.ok) {
      const adminEvents = await adminEventsResponse.json();
      console.log('✅ 管理员活动API响应:', adminEvents.length, '个活动');
    } else {
      const errorText = await adminEventsResponse.text();
      console.log('❌ 管理员活动API失败:', adminEventsResponse.status, errorText);
    }

  } catch (error) {
    console.log('❌ 调试过程中出现错误:', error.message);
  }
};

// 运行调试
debugEventsAPI();
