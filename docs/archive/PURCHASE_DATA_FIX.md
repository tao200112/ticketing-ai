# 购买数据不显示问题修复指南

## 问题描述
用户买票后，数据没有出现在个人账户和商家购买页面。

## 修复内容

### 1. 票据服务增强
- 修改了 `lib/ticket-service.js`，添加了本地存储支持
- 票据创建后自动保存到 `localStorage`
- 支持商家购买记录和用户票据历史

### 2. 数据保存逻辑
- **购买记录**：保存到 `purchaseRecords` 用于商家购买页面
- **用户票据**：保存到 `localUsers` 用于个人账户显示
- **数据关联**：确保票据与用户和商家正确关联

### 3. 结账会话增强
- 修改了 `app/api/checkout_sessions/route.js`
- 添加了商家ID到metadata中
- 确保购买记录能正确关联到商家

## 测试步骤

### 步骤1：清理现有数据
在浏览器控制台中执行：
```javascript
// 清理现有数据
localStorage.removeItem('purchaseRecords');
localStorage.removeItem('localUsers');
console.log('数据已清理');
```

### 步骤2：模拟买票流程
在浏览器控制台中执行：
```javascript
// 模拟票据创建后的数据保存
const purchaseRecord = {
  id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  orderId: `order_${Date.now()}`,
  sessionId: `cs_test_${Date.now()}`,
  customerEmail: 'taoliu0711@gmail.com',
  customerName: 'TAO LIU',
  eventId: '1761271865234',
  eventTitle: '11',
  ticketType: '1',
  quantity: 1,
  amount: 1200,
  currency: 'usd',
  status: 'completed',
  purchaseDate: new Date().toISOString(),
  merchantId: 'merchant_123',
  tickets: [{
    id: `ticket_${Date.now()}`,
    shortId: 'ABC12345',
    tier: '1',
    status: 'unused',
    qrPayload: 'qr_payload_data'
  }]
};

const userTicketRecord = {
  id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  eventName: '11',
  ticketType: '1',
  price: '12.00',
  purchaseDate: new Date().toLocaleDateString('en-US'),
  status: 'valid',
  customerEmail: 'taoliu0711@gmail.com',
  sessionId: `cs_test_${Date.now()}`,
  qrCode: JSON.stringify({
    ticketId: `ticket_${Date.now()}`,
    eventName: '11',
    ticketType: '1',
    purchaseDate: new Date().toLocaleDateString('en-US'),
    price: '12.00',
    customerEmail: 'taoliu0711@gmail.com'
  })
};

// 保存购买记录
const existingPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
existingPurchases.push(purchaseRecord);
localStorage.setItem('purchaseRecords', JSON.stringify(existingPurchases));

// 保存用户票据
const existingUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
const userIndex = existingUsers.findIndex(u => u.email === 'taoliu0711@gmail.com');

if (userIndex !== -1) {
  if (!existingUsers[userIndex].tickets) {
    existingUsers[userIndex].tickets = [];
  }
  existingUsers[userIndex].tickets.push(userTicketRecord);
} else {
  const newUser = {
    id: '1761264732205',
    email: 'taoliu0711@gmail.com',
    name: 'TAO LIU',
    age: 22,
    createdAt: '2025-10-24T00:12:12.205Z',
    tickets: [userTicketRecord]
  };
  existingUsers.push(newUser);
}

localStorage.setItem('localUsers', JSON.stringify(existingUsers));
console.log('测试数据已保存');
```

### 步骤3：验证修复
1. 访问个人账户页面：`http://localhost:3000/account`
2. 检查"My Tickets"部分是否显示票据
3. 访问商家购买页面：`http://localhost:3000/merchant/purchases`
4. 检查是否显示购买记录

## 预期结果

修复后应该能看到：
- 个人账户页面显示票据历史
- 商家购买页面显示购买记录
- 票据信息包含活动名称、价格、购买日期等

## 故障排除

### 如果数据仍然不显示：

1. **检查localStorage**
   ```javascript
   console.log('购买记录:', JSON.parse(localStorage.getItem('purchaseRecords') || '[]'));
   console.log('用户数据:', JSON.parse(localStorage.getItem('localUsers') || '[]'));
   ```

2. **检查用户登录状态**
   ```javascript
   console.log('用户登录状态:', localStorage.getItem('userData'));
   ```

3. **检查商家登录状态**
   ```javascript
   console.log('商家登录状态:', localStorage.getItem('merchantUser'));
   ```

## 注意事项

- 确保在正确的浏览器窗口中测试
- 清除浏览器缓存后重新测试
- 检查控制台是否有错误信息
