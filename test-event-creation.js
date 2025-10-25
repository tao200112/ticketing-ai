#!/usr/bin/env node

const testEventCreation = async () => {
  console.log('🧪 测试活动创建功能\n');

  const testEvent = {
    title: "测试活动",
    description: "这是一个测试活动描述",
    startDate: "2024-12-31",
    endDate: "2024-12-31",
    location: "测试地点",
    maxAttendees: 100,
    merchantId: "admin-created",
    ticketTypes: [
      {
        name: "普通票",
        amount_cents: "5000",
        inventory: "50",
        limit_per_user: "5"
      }
    ]
  };

  try {
    console.log('📝 测试数据:');
    console.log(JSON.stringify(testEvent, null, 2));
    
    console.log('\n🚀 发送请求到活动创建API...');
    
    const response = await fetch('http://localhost:3000/api/admin/events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent)
    });

    console.log(`📊 响应状态: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 活动创建成功！');
      console.log('📋 返回数据:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ 活动创建失败');
      console.log('错误信息:', error);
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
};

// 运行测试
testEventCreation();
