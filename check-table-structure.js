#!/usr/bin/env node

const checkTableStructure = async () => {
  console.log('🔍 检查数据库表结构\n');

  try {
    // 测试简单的events查询
    console.log('📋 测试events表查询...');
    const eventsResponse = await fetch('http://localhost:3000/api/admin/events');
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log('✅ events表查询成功，活动数量:', events.length);
      if (events.length > 0) {
        console.log('📋 第一个活动结构:', JSON.stringify(events[0], null, 2));
      }
    } else {
      console.log('❌ events表查询失败:', eventsResponse.status);
    }

    // 测试创建最简单的活动
    console.log('\n🎫 测试最简单的活动创建...');
    const simpleEventData = {
      title: "简单测试活动",
      description: "测试",
      startDate: "2024-12-31",
      endDate: "2024-12-31",
      location: "测试地点",
      merchantId: "4e55af8e-b07a-4410-80ee-b7ada4a58e00" // 使用现有的商家ID
    };

    const createResponse = await fetch('http://localhost:3000/api/admin/events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleEventData)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ 简单活动创建成功:', result);
    } else {
      const error = await createResponse.text();
      console.log('❌ 简单活动创建失败:', createResponse.status, error);
    }

  } catch (error) {
    console.log('❌ 检查过程中出现错误:', error.message);
  }
};

// 运行检查
checkTableStructure();
