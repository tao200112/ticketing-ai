#!/usr/bin/env node

const detailedDebug = async () => {
  console.log('🔍 详细调试活动API\n');

  try {
    // 测试活动API
    console.log('📋 测试活动API...');
    const eventsResponse = await fetch('http://localhost:3000/api/events');
    console.log('📊 响应状态:', eventsResponse.status);
    console.log('📊 响应头:', Object.fromEntries(eventsResponse.headers.entries()));
    
    const eventsText = await eventsResponse.text();
    console.log('📊 原始响应:', eventsText);
    
    try {
      const events = JSON.parse(eventsText);
      console.log('📊 解析后的数据:', events);
      console.log('📊 数据类型:', typeof events);
      console.log('📊 是否为数组:', Array.isArray(events));
      if (Array.isArray(events)) {
        console.log('📊 数组长度:', events.length);
      }
    } catch (parseError) {
      console.log('❌ JSON解析失败:', parseError.message);
    }

  } catch (error) {
    console.log('❌ 调试过程中出现错误:', error.message);
  }
};

// 运行详细调试
detailedDebug();
