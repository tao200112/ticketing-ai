#!/usr/bin/env node

const testDatabaseConnection = async () => {
  console.log('🔍 测试数据库连接和表结构\n');

  try {
    // 测试统计API
    console.log('📊 测试统计API...');
    const statsResponse = await fetch('http://localhost:3000/api/admin/stats');
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ 统计API正常:', stats);
    } else {
      console.log('❌ 统计API失败:', statsResponse.status);
    }

    // 测试商家API
    console.log('\n🏢 测试商家API...');
    const merchantsResponse = await fetch('http://localhost:3000/api/admin/merchants');
    if (merchantsResponse.ok) {
      const merchants = await merchantsResponse.json();
      console.log('✅ 商家API正常，商家数量:', merchants.length);
      if (merchants.length > 0) {
        console.log('📋 第一个商家:', merchants[0]);
      }
    } else {
      console.log('❌ 商家API失败:', merchantsResponse.status);
    }

    // 测试活动API
    console.log('\n🎪 测试活动API...');
    const eventsResponse = await fetch('http://localhost:3000/api/events');
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ 活动API正常，活动数量:', events.length);
    } else {
      console.log('❌ 活动API失败:', eventsResponse.status);
    }

    // 测试活动创建API
    console.log('\n🎫 测试活动创建API...');
    const createEventData = {
      title: "数据库连接测试活动",
      description: "这是一个测试活动，用于验证数据库连接",
      startDate: "2024-12-31",
      endDate: "2024-12-31",
      location: "测试地点",
      maxAttendees: 100,
      merchantId: "admin-created"
    };

    const createResponse = await fetch('http://localhost:3000/api/admin/events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createEventData)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ 活动创建成功:', result);
    } else {
      const error = await createResponse.text();
      console.log('❌ 活动创建失败:', createResponse.status, error);
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testDatabaseConnection();
