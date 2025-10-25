#!/usr/bin/env node

const testDisplayFix = async () => {
  console.log('🔍 测试显示修复\n');

  try {
    // 测试活动API
    console.log('📋 测试活动API...');
    const response = await fetch('http://localhost:3000/api/events');
    const data = await response.json();
    console.log('📊 活动API响应:', data);
    
    // 处理不同的数据格式
    let dbEvents = []
    if (Array.isArray(data)) {
      dbEvents = data
    } else if (data && data.data && Array.isArray(data.data)) {
      dbEvents = data.data
    } else if (data && data.ok && data.data && Array.isArray(data.data)) {
      dbEvents = data.data
    }
    
    console.log('📊 处理后的活动数据:', dbEvents.length, '个活动');
    dbEvents.forEach((event, index) => {
      console.log(`📋 活动 ${index + 1}:`, event.name);
    });

    // 测试数据合并
    console.log('\n🔄 测试数据合并...');
    const merchantEvents = JSON.parse('[]') // 模拟空的localStorage
    const allEvents = [...dbEvents, ...merchantEvents]
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    )
    
    console.log('📊 合并后的活动数据:', uniqueEvents.length, '个活动');
    uniqueEvents.forEach((event, index) => {
      console.log(`📋 最终活动 ${index + 1}:`, event.name);
    });

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testDisplayFix();
