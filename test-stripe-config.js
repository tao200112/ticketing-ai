#!/usr/bin/env node

const testStripeConfig = async () => {
  console.log('🔍 测试Stripe配置\n');

  try {
    // 测试checkout_sessions API
    console.log('📋 测试checkout_sessions API...');
    const response = await fetch('http://localhost:3000/api/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: 'ridiculous-chicken',
        ticketType: 'Regular Ticket (21+)',
        quantity: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        userId: 'demo-user',
        userToken: 'demo-token',
        eventData: {
          title: 'Ridiculous Chicken Night Event',
          description: 'Test event',
          prices: [
            {
              name: 'Regular Ticket (21+)',
              amount_cents: 1500
            }
          ]
        }
      })
    });

    console.log('📊 响应状态:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ checkout_sessions API响应:', data);
    } else {
      const error = await response.text();
      console.log('❌ checkout_sessions API失败:', response.status, error);
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:', error.message);
  }
};

// 运行测试
testStripeConfig();
