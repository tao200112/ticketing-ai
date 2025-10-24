# 票务记录同步修复指南

## 问题描述
活动显示售票三张，但是records记录为空，票务记录没有同步。

## 问题原因
票据创建后没有正确保存到localStorage，导致：
1. 个人账户页面看不到票据历史
2. 商家购买页面看不到购买记录
3. 管理员界面客户管理没有数据

## 修复内容

### 1. 修复票据服务
- 移除了服务器端的localStorage保存逻辑（服务器端无法访问localStorage）
- 将localStorage保存逻辑移至客户端

### 2. 修复成功页面
- 在 `app/success/page.js` 中添加了 `saveTicketToLocalStorage` 函数
- 在支付成功后自动保存票据记录到localStorage
- 同时保存购买记录和用户票据记录

### 3. 修复管理员界面
- 修改了 `app/admin/dashboard/page.js` 中的客户数据加载逻辑
- 将数据源从 `localStorage.getItem('customers')` 改为 `localStorage.getItem('localUsers')`

## 测试步骤

### 步骤1：运行测试脚本
在浏览器控制台中执行以下代码：

```javascript
// 测试票据记录同步
console.log('🧪 测试票据记录同步...');

// 模拟买票后的数据保存
function simulateTicketPurchase() {
  console.log('步骤1：模拟买票流程...');
  
  // 模拟票据数据
  const ticket = {
    id: `ticket_${Date.now()}`,
    eventName: '11',
    ticketType: '1',
    quantity: 1,
    price: '12.00',
    purchaseDate: new Date().toLocaleDateString('en-US'),
    status: 'valid',
    sessionId: `cs_test_${Date.now()}`,
    customerEmail: 'taoliu0711@gmail.com',
    customerName: 'TAO LIU'
  };

  // 保存购买记录到purchaseRecords
  const purchaseRecord = {
    id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    orderId: `order_${Date.now()}`,
    sessionId: ticket.sessionId,
    customerEmail: ticket.customerEmail,
    customerName: ticket.customerName,
    eventId: ticket.eventName,
    eventTitle: ticket.eventName,
    ticketType: ticket.ticketType,
    quantity: ticket.quantity,
    amount: parseFloat(ticket.price) * 100, // 转换为分
    currency: 'usd',
    status: 'completed',
    purchaseDate: new Date().toISOString(),
    merchantId: 'merchant_123',
    tickets: [{
      id: ticket.id,
      shortId: `TKT${Date.now().toString(36).toUpperCase()}`,
      tier: ticket.ticketType,
      status: ticket.status,
      qrPayload: JSON.stringify(ticket)
    }]
  };

  // 保存用户票据记录到localUsers
  const userTicketRecord = {
    id: ticket.id,
    eventName: ticket.eventName,
    ticketType: ticket.ticketType,
    price: ticket.price,
    purchaseDate: ticket.purchaseDate,
    status: ticket.status,
    customerEmail: ticket.customerEmail,
    sessionId: ticket.sessionId,
    qrCode: JSON.stringify(ticket)
  };

  // 保存购买记录
  const existingPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  existingPurchases.push(purchaseRecord);
  localStorage.setItem('purchaseRecords', JSON.stringify(existingPurchases));

  // 保存用户票据
  const existingUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
  const userIndex = existingUsers.findIndex(u => u.email === ticket.customerEmail);
  
  if (userIndex !== -1) {
    // 用户已存在，添加票据
    if (!existingUsers[userIndex].tickets) {
      existingUsers[userIndex].tickets = [];
    }
    existingUsers[userIndex].tickets.push(userTicketRecord);
  } else {
    // 用户不存在，创建新用户
    const newUser = {
      id: `user_${Date.now()}`,
      email: ticket.customerEmail,
      name: ticket.customerName,
      age: 25,
      createdAt: new Date().toISOString(),
      tickets: [userTicketRecord]
    };
    existingUsers.push(newUser);
  }
  
  localStorage.setItem('localUsers', JSON.stringify(existingUsers));
  
  console.log('✅ 票据记录已保存到localStorage');
  console.log('📊 购买记录数量:', existingPurchases.length);
  console.log('📊 用户数量:', existingUsers.length);
}

// 验证数据同步
function verifyDataSync() {
  console.log('步骤2：验证数据同步...');
  
  const purchaseRecords = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  const localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
  
  console.log('📊 购买记录数量:', purchaseRecords.length);
  console.log('📊 用户数量:', localUsers.length);
  
  if (purchaseRecords.length > 0) {
    console.log('✅ 购买记录存在:');
    purchaseRecords.forEach((purchase, index) => {
      console.log(`  购买记录 ${index + 1}:`, {
        id: purchase.id,
        customerEmail: purchase.customerEmail,
        eventTitle: purchase.eventTitle,
        amount: purchase.amount,
        status: purchase.status
      });
    });
  }
  
  if (localUsers.length > 0) {
    console.log('✅ 用户数据存在:');
    localUsers.forEach((user, index) => {
      console.log(`  用户 ${index + 1}:`, {
        id: user.id,
        email: user.email,
        name: user.name,
        tickets: user.tickets ? user.tickets.length : 0
      });
    });
  }
}

// 运行测试
simulateTicketPurchase();
verifyDataSync();

console.log('🎉 测试完成！');
console.log('现在请检查以下页面：');
console.log('1. 个人账户页面: http://localhost:3000/account');
console.log('2. 商家购买页面: http://localhost:3000/merchant/purchases');
console.log('3. 管理员界面: http://localhost:3000/admin/dashboard');
```

### 步骤2：验证页面数据
1. **个人账户页面**：访问 `http://localhost:3000/account`
   - 检查"My Tickets"部分是否显示票据
   - 应该看到活动名称为"11"的票据

2. **商家购买页面**：访问 `http://localhost:3000/merchant/purchases`
   - 检查是否显示购买记录
   - 应该看到客户邮箱为"taoliu0711@gmail.com"的购买记录

3. **管理员界面**：访问 `http://localhost:3000/admin/dashboard`
   - 切换到"Customers"标签页
   - 检查是否显示客户数据
   - 应该看到客户邮箱为"taoliu0711@gmail.com"的用户

### 步骤3：验证数据完整性
在浏览器控制台中执行以下代码来验证数据：

```javascript
// 验证购买记录
console.log('购买记录:', JSON.parse(localStorage.getItem('purchaseRecords') || '[]'));

// 验证用户票据
console.log('用户数据:', JSON.parse(localStorage.getItem('localUsers') || '[]'));
```

## 预期结果

修复后应该看到：
- ✅ 个人账户页面显示票据历史
- ✅ 商家购买页面显示购买记录
- ✅ 管理员界面客户管理显示客户数据
- ✅ 数据在各个页面之间保持同步

## 故障排除

### 如果数据仍然不显示：

1. **检查localStorage数据**
   ```javascript
   console.log('localStorage数据:', {
     purchaseRecords: JSON.parse(localStorage.getItem('purchaseRecords') || '[]'),
     localUsers: JSON.parse(localStorage.getItem('localUsers') || '[]')
   });
   ```

2. **清除缓存并重新测试**
   - 刷新页面
   - 重新运行测试脚本
   - 检查控制台是否有错误信息

3. **检查页面加载**
   - 确保页面正确加载
   - 检查网络请求是否成功
   - 查看控制台错误信息

## 注意事项

- 确保在测试前已经执行了买票流程
- 票据数据保存在localStorage中，刷新页面后数据仍然存在
- 如果localStorage被清除，数据会丢失，需要重新买票
- 测试脚本会创建模拟数据，实际买票时数据会自动保存
