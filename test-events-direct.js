#!/usr/bin/env node

const testEventsDirect = async () => {
  console.log('🔍 直接测试活动API\n');

  try {
    // 直接测试活动API
    console.log('📋 直接测试活动API...');
    const response = await fetch('http://localhost:3000/api/events');
    console.log('📊 响应状态:', response.status);
    
    const responseText = await response.text();
    console.log('📊 原始响应:', responseText);
    
    const events = JSON.parse(responseText);
    console.log('📊 解析后的数据:', events);
    console.log('📊 数据类型:', typeof events);
    
    if (events && events.data && Array.isArray(events.data)) {
      console.log('✅ 找到活动数据:', events.data.length, '个活动');
      events.data.forEach((event, index) => {
        console.log(`📋 活动 ${index + 1}:`, event.name);
      });
    } else if (Array.isArray(events)) {
      console.log('✅ 直接数组格式:', events.length, '个活动');
      events.forEach((event, index) => {
        console.log(`📋 活动 ${index + 1}:`, event.name);
      });
    } else {
      console.log('❌ 数据格式不正确');
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testEventsDirect();
