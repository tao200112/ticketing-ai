// 测试商家购买页面金额显示
console.log('🧪 测试商家购买页面金额显示...');

// 步骤1：检查购买记录中的金额字段
function checkPurchaseAmountFields() {
  console.log('步骤1：检查购买记录中的金额字段...');
  
  const purchaseRecords = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  console.log('📊 购买记录数量:', purchaseRecords.length);
  
  if (purchaseRecords.length > 0) {
    console.log('✅ 找到购买记录:');
    purchaseRecords.forEach((purchase, index) => {
      console.log(`  购买记录 ${index + 1}:`, {
        id: purchase.id,
        amount: purchase.amount,
        totalAmount: purchase.totalAmount,
        currency: purchase.currency,
        status: purchase.status
      });
    });
  } else {
    console.log('⚠️ 没有找到购买记录');
  }
  
  return purchaseRecords;
}

// 步骤2：测试金额计算逻辑
function testAmountCalculation() {
  console.log('步骤2：测试金额计算逻辑...');
  
  const purchaseRecords = checkPurchaseAmountFields();
  
  if (purchaseRecords.length === 0) {
    console.log('⚠️ 没有购买记录可计算');
    return;
  }
  
  // 模拟商家购买页面的金额计算逻辑
  const getTotalRevenue = (purchases) => {
    return purchases.reduce((total, purchase) => total + (purchase.amount || purchase.totalAmount || 0), 0)
  };
  
  const totalRevenue = getTotalRevenue(purchaseRecords);
  console.log('📊 总金额计算:', totalRevenue);
  console.log('📊 总金额显示:', `$${(totalRevenue / 100).toFixed(2)}`);
  
  // 检查每个购买记录的金额显示
  purchaseRecords.forEach((purchase, index) => {
    const amount = purchase.amount || purchase.totalAmount || 0;
    const displayAmount = (amount / 100).toFixed(2);
    console.log(`  购买记录 ${index + 1} 金额显示: $${displayAmount}`);
  });
}

// 步骤3：创建测试购买记录
function createTestPurchaseRecords() {
  console.log('步骤3：创建测试购买记录...');
  
  const testPurchases = [
    {
      id: 'purchase_amount_test_1',
      orderId: 'order_amount_test_1',
      sessionId: 'cs_test_amount_1',
      customerEmail: 'test1@example.com',
      customerName: 'Test User 1',
      eventId: '11',
      eventTitle: '11',
      ticketType: '1',
      quantity: 1,
      amount: 1200, // 12.00美元，以分为单位
      currency: 'usd',
      status: 'completed',
      purchaseDate: new Date().toISOString(),
      merchantId: 'merchant_123',
      tickets: [{
        id: 'ticket_amount_test_1',
        shortId: 'TKT001',
        tier: '1',
        status: 'valid',
        qrPayload: JSON.stringify({ ticketId: 'ticket_amount_test_1' })
      }]
    },
    {
      id: 'purchase_amount_test_2',
      orderId: 'order_amount_test_2',
      sessionId: 'cs_test_amount_2',
      customerEmail: 'test2@example.com',
      customerName: 'Test User 2',
      eventId: '11',
      eventTitle: '11',
      ticketType: '1',
      quantity: 2,
      amount: 2400, // 24.00美元，以分为单位
      currency: 'usd',
      status: 'completed',
      purchaseDate: new Date().toISOString(),
      merchantId: 'merchant_123',
      tickets: [{
        id: 'ticket_amount_test_2',
        shortId: 'TKT002',
        tier: '1',
        status: 'valid',
        qrPayload: JSON.stringify({ ticketId: 'ticket_amount_test_2' })
      }]
    }
  ];
  
  // 获取现有购买记录
  const existingPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  
  // 添加测试购买记录
  testPurchases.forEach(testPurchase => {
    if (!existingPurchases.find(p => p.id === testPurchase.id)) {
      existingPurchases.push(testPurchase);
    }
  });
  
  localStorage.setItem('purchaseRecords', JSON.stringify(existingPurchases));
  
  console.log('✅ 测试购买记录已创建');
  console.log('📊 总购买记录数量:', existingPurchases.length);
  
  return existingPurchases;
}

// 步骤4：验证金额显示
function verifyAmountDisplay() {
  console.log('步骤4：验证金额显示...');
  
  // 创建测试数据
  createTestPurchaseRecords();
  
  // 测试金额计算
  testAmountCalculation();
  
  console.log('🎉 金额显示测试完成！');
  console.log('现在请访问商家购买页面: http://localhost:3000/merchant/purchases');
  console.log('检查金额是否正确显示');
}

// 运行测试
verifyAmountDisplay();
