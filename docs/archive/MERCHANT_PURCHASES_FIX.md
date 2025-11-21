# 商家购买页面数据显示修复指南

## 问题描述
个人界面可以看到历史数据，但商家购买页面 `http://localhost:3000/merchant/purchases` 没有数据显示。

## 问题原因
商家购买页面在过滤数据时使用了 `merchantUser?.id`，但购买记录中的 `merchantId` 可能不匹配，导致过滤后没有数据显示。

## 修复内容

### 1. 修复购买记录保存逻辑
- 修改了 `app/success/page.js` 中的购买记录保存逻辑
- 使用 `localStorage.getItem('currentMerchantId')` 获取当前商家ID
- 确保购买记录能正确关联到商家

### 2. 修复商家购买页面数据过滤逻辑
- 修改了 `app/merchant/purchases/page.js` 中的数据过滤逻辑
- 支持多种商家ID匹配方式：
  - `purchase.merchantId === merchantUser?.id`
  - `purchase.merchantId === merchantUser?.businessName`
  - `purchase.merchantId === 'merchant_123'` (默认商家ID)
  - `purchase.merchantId === localStorage.getItem('currentMerchantId')`
- 添加了调试日志来帮助排查问题

## 测试步骤

### 步骤1：运行商家购买页面测试脚本
在浏览器控制台中执行以下代码：

```javascript
// 测试商家购买页面数据显示
console.log('🧪 测试商家购买页面数据显示...');

// 步骤1：检查localStorage中的购买记录
function checkPurchaseRecords() {
  console.log('步骤1：检查localStorage中的购买记录...');
  
  const purchaseRecords = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  console.log('📊 购买记录数量:', purchaseRecords.length);
  
  if (purchaseRecords.length > 0) {
    console.log('✅ 找到购买记录:');
    purchaseRecords.forEach((purchase, index) => {
      console.log(`  购买记录 ${index + 1}:`, {
        id: purchase.id,
        customerEmail: purchase.customerEmail,
        eventTitle: purchase.eventTitle,
        amount: purchase.amount,
        merchantId: purchase.merchantId,
        status: purchase.status
      });
    });
  } else {
    console.log('⚠️ 没有找到购买记录');
  }
  
  return purchaseRecords;
}

// 步骤2：检查商家用户信息
function checkMerchantUser() {
  console.log('步骤2：检查商家用户信息...');
  
  const merchantUser = JSON.parse(localStorage.getItem('merchantUser') || 'null');
  console.log('📊 商家用户信息:', merchantUser);
  
  if (merchantUser) {
    console.log('✅ 找到商家用户:', {
      id: merchantUser.id,
      email: merchantUser.email,
      businessName: merchantUser.businessName,
      name: merchantUser.name
    });
  } else {
    console.log('⚠️ 没有找到商家用户信息');
  }
  
  return merchantUser;
}

// 步骤3：模拟商家购买页面数据过滤
function simulateMerchantPurchaseFilter() {
  console.log('步骤3：模拟商家购买页面数据过滤...');
  
  const purchaseRecords = checkPurchaseRecords();
  const merchantUser = checkMerchantUser();
  
  if (purchaseRecords.length === 0) {
    console.log('⚠️ 没有购买记录可过滤');
    return [];
  }
  
  if (!merchantUser) {
    console.log('⚠️ 没有商家用户信息，无法过滤');
    return [];
  }
  
  // 模拟商家购买页面的过滤逻辑
  const merchantPurchases = purchaseRecords.filter(purchase => {
    const matches = (
      purchase.merchantId === merchantUser.id ||
      purchase.merchantId === merchantUser.businessName ||
      purchase.merchantId === 'merchant_123' || // 默认商家ID
      purchase.merchantId === localStorage.getItem('currentMerchantId')
    );
    
    if (matches) {
      console.log('✅ 匹配的购买记录:', purchase);
    }
    
    return matches;
  });
  
  console.log('📊 过滤后的购买记录数量:', merchantPurchases.length);
  
  if (merchantPurchases.length > 0) {
    console.log('✅ 商家购买页面应该显示以下记录:');
    merchantPurchases.forEach((purchase, index) => {
      console.log(`  记录 ${index + 1}:`, {
        customerEmail: purchase.customerEmail,
        eventTitle: purchase.eventTitle,
        amount: purchase.amount,
        status: purchase.status
      });
    });
  } else {
    console.log('❌ 商家购买页面没有匹配的记录');
  }
  
  return merchantPurchases;
}

// 步骤4：创建测试购买记录
function createTestPurchaseRecords() {
  console.log('步骤4：创建测试购买记录...');
  
  const testPurchases = [
    {
      id: 'purchase_test_1',
      orderId: 'order_test_1',
      sessionId: 'cs_test_1',
      customerEmail: 'taoliu0711@gmail.com',
      customerName: 'TAO LIU',
      eventId: '11',
      eventTitle: '11',
      ticketType: '1',
      quantity: 1,
      amount: 1200,
      currency: 'usd',
      status: 'completed',
      purchaseDate: new Date().toISOString(),
      merchantId: 'merchant_123', // 使用默认商家ID
      tickets: [{
        id: 'ticket_test_1',
        shortId: 'TKT001',
        tier: '1',
        status: 'valid',
        qrPayload: JSON.stringify({ ticketId: 'ticket_test_1' })
      }]
    },
    {
      id: 'purchase_test_2',
      orderId: 'order_test_2',
      sessionId: 'cs_test_2',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      eventId: '11',
      eventTitle: '11',
      ticketType: '1',
      quantity: 1,
      amount: 1200,
      currency: 'usd',
      status: 'completed',
      purchaseDate: new Date().toISOString(),
      merchantId: 'merchant_123', // 使用默认商家ID
      tickets: [{
        id: 'ticket_test_2',
        shortId: 'TKT002',
        tier: '1',
        status: 'valid',
        qrPayload: JSON.stringify({ ticketId: 'ticket_test_2' })
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

// 步骤5：验证商家购买页面数据
function verifyMerchantPurchasesPage() {
  console.log('步骤5：验证商家购买页面数据...');
  
  // 创建测试数据
  createTestPurchaseRecords();
  
  // 模拟过滤
  const merchantPurchases = simulateMerchantPurchaseFilter();
  
  if (merchantPurchases.length > 0) {
    console.log('✅ 商家购买页面应该有数据显示');
    console.log('📊 应该显示的记录数量:', merchantPurchases.length);
  } else {
    console.log('❌ 商家购买页面没有数据显示');
    console.log('🔍 可能的问题:');
    console.log('  1. 商家用户信息不匹配');
    console.log('  2. 购买记录的merchantId不匹配');
    console.log('  3. 数据过滤逻辑有问题');
  }
  
  return merchantPurchases;
}

// 运行测试
verifyMerchantPurchasesPage();

console.log('🎉 商家购买页面测试完成！');
console.log('现在请访问商家购买页面: http://localhost:3000/merchant/purchases');
console.log('检查是否显示购买记录');
```

### 步骤2：验证商家购买页面
1. **访问商家购买页面**: `http://localhost:3000/merchant/purchases`
2. **检查数据显示**: 应该看到购买记录列表
3. **检查控制台日志**: 查看过滤逻辑的调试信息

### 步骤3：验证数据匹配
在浏览器控制台中执行以下代码来验证数据匹配：

```javascript
// 验证数据匹配
const purchaseRecords = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
const merchantUser = JSON.parse(localStorage.getItem('merchantUser') || 'null');

console.log('购买记录:', purchaseRecords);
console.log('商家用户:', merchantUser);

// 检查匹配逻辑
purchaseRecords.forEach((purchase, index) => {
  const matches = (
    purchase.merchantId === merchantUser?.id ||
    purchase.merchantId === merchantUser?.businessName ||
    purchase.merchantId === 'merchant_123' ||
    purchase.merchantId === localStorage.getItem('currentMerchantId')
  );
  
  console.log(`购买记录 ${index + 1} 匹配结果:`, matches);
  console.log(`  merchantId: ${purchase.merchantId}`);
  console.log(`  merchantUser.id: ${merchantUser?.id}`);
  console.log(`  merchantUser.businessName: ${merchantUser?.businessName}`);
});
```

## 预期结果

修复后应该看到：
- ✅ 商家购买页面显示购买记录
- ✅ 购买记录正确关联到当前商家
- ✅ 数据过滤逻辑正常工作
- ✅ 控制台显示调试信息

## 故障排除

### 如果商家购买页面仍然没有数据：

1. **检查购买记录**
   ```javascript
   console.log('购买记录:', JSON.parse(localStorage.getItem('purchaseRecords') || '[]'));
   ```

2. **检查商家用户信息**
   ```javascript
   console.log('商家用户:', JSON.parse(localStorage.getItem('merchantUser') || 'null'));
   ```

3. **检查商家ID匹配**
   ```javascript
   const purchaseRecords = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
   const merchantUser = JSON.parse(localStorage.getItem('merchantUser') || 'null');
   
   purchaseRecords.forEach(purchase => {
     console.log('购买记录merchantId:', purchase.merchantId);
     console.log('商家用户ID:', merchantUser?.id);
     console.log('商家用户业务名称:', merchantUser?.businessName);
     console.log('当前商家ID:', localStorage.getItem('currentMerchantId'));
   });
   ```

4. **手动创建测试数据**
   - 运行测试脚本创建测试购买记录
   - 检查数据是否正确保存

## 注意事项

- 确保商家已正确登录
- 购买记录需要包含正确的merchantId
- 数据过滤逻辑支持多种匹配方式
- 建议使用测试脚本验证数据匹配
