# 完整测试指南

## 🧪 测试步骤

### 步骤1：准备测试环境
1. 确保应用程序正在运行：`http://localhost:3000`
2. 打开浏览器开发者工具（F12）
3. 切换到Console标签页

### 步骤2：执行测试脚本
在浏览器控制台中复制粘贴以下代码：

```javascript
// 测试买票流程数据保存
console.log('🧪 开始测试买票流程数据保存...');

// 步骤1：清理现有数据
console.log('步骤1：清理现有数据...');
localStorage.removeItem('purchaseRecords');
localStorage.removeItem('localUsers');
console.log('✅ 数据已清理');

// 步骤2：模拟票据创建后的数据保存
console.log('步骤2：模拟票据创建后的数据保存...');

// 模拟购买记录
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

// 模拟用户票据记录
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

// 保存购买记录到localStorage
try {
  const existingPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');
  existingPurchases.push(purchaseRecord);
  localStorage.setItem('purchaseRecords', JSON.stringify(existingPurchases));
  console.log('✅ 购买记录已保存到localStorage');
} catch (error) {
  console.error('❌ 保存购买记录失败:', error);
}

// 保存用户票据到localStorage
try {
  const existingUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
  const userIndex = existingUsers.findIndex(u => u.email === 'taoliu0711@gmail.com');
  
  if (userIndex !== -1) {
    if (!existingUsers[userIndex].tickets) {
      existingUsers[userIndex].tickets = [];
    }
    existingUsers[userIndex].tickets.push(userTicketRecord);
    console.log('✅ 用户票据已保存到localStorage');
  } else {
    console.log('⚠️ 未找到用户，创建新用户记录');
    const newUser = {
      id: '1761264732205',
      email: 'taoliu0711@gmail.com',
      name: 'TAO LIU',
      age: 22,
      createdAt: '2025-10-24T00:12:12.205Z',
      tickets: [userTicketRecord]
    };
    existingUsers.push(newUser);
    console.log('✅ 新用户和票据已保存到localStorage');
  }
  
  localStorage.setItem('localUsers', JSON.stringify(existingUsers));
} catch (error) {
  console.error('❌ 保存用户票据失败:', error);
}

// 步骤3：验证数据保存
console.log('步骤3：验证数据保存...');
console.log('📊 购买记录数量:', JSON.parse(localStorage.getItem('purchaseRecords') || '[]').length);
console.log('📊 用户数量:', JSON.parse(localStorage.getItem('localUsers') || '[]').length);

const user = JSON.parse(localStorage.getItem('localUsers') || '[]').find(u => u.email === 'taoliu0711@gmail.com');
if (user) {
  console.log('📊 用户票据数量:', user.tickets ? user.tickets.length : 0);
}

console.log('🎉 测试完成！请检查以下页面：');
console.log('1. 个人账户页面: http://localhost:3000/account');
console.log('2. 商家购买页面: http://localhost:3000/merchant/purchases');
```

### 步骤3：验证测试结果

#### 3.1 测试个人账户页面
1. 访问：`http://localhost:3000/account`
2. 检查"My Tickets"部分是否显示票据
3. 验证票据信息包含：
   - 活动名称：11
   - 票据类型：1
   - 价格：$12.00
   - 购买日期
   - 状态：valid

#### 3.2 测试商家购买页面
1. 访问：`http://localhost:3000/merchant/purchases`
2. 检查是否显示购买记录
3. 验证购买记录包含：
   - 客户邮箱：taoliu0711@gmail.com
   - 客户姓名：TAO LIU
   - 活动名称：11
   - 票据类型：1
   - 金额：$12.00
   - 购买日期
   - 状态：completed

### 步骤4：测试真实买票流程

#### 4.1 用户登录
1. 访问：`http://localhost:3000/auth/login`
2. 使用邮箱：`taoliu0711@gmail.com`
3. 输入密码登录

#### 4.2 购买票据
1. 访问活动页面：`http://localhost:3000/events/dynamic/11`
2. 选择票据类型
3. 填写客户信息
4. 完成支付流程

#### 4.3 验证结果
1. 检查个人账户页面是否显示新票据
2. 检查商家购买页面是否显示新购买记录

## 🔍 故障排除

### 如果数据不显示：

1. **检查控制台错误**
   - 打开开发者工具
   - 查看Console标签页是否有错误信息

2. **检查localStorage数据**
   ```javascript
   console.log('购买记录:', JSON.parse(localStorage.getItem('purchaseRecords') || '[]'));
   console.log('用户数据:', JSON.parse(localStorage.getItem('localUsers') || '[]'));
   ```

3. **检查用户登录状态**
   ```javascript
   console.log('用户登录状态:', localStorage.getItem('userData'));
   ```

4. **检查商家登录状态**
   ```javascript
   console.log('商家登录状态:', localStorage.getItem('merchantUser'));
   ```

## ✅ 预期结果

测试成功后应该看到：
- ✅ 个人账户页面显示票据历史
- ✅ 商家购买页面显示购买记录
- ✅ 票据信息完整且正确
- ✅ 购买记录信息完整且正确

## 📝 测试报告

请记录测试结果：
- [ ] 个人账户页面显示票据
- [ ] 商家购买页面显示购买记录
- [ ] 票据信息完整
- [ ] 购买记录信息完整
- [ ] 真实买票流程正常
- [ ] 数据持久化正常
