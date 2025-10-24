# 缓存清理和页面刷新指南

## 问题描述
测试脚本显示localStorage中有数据，但实际页面没有显示票据信息。这是典型的浏览器缓存问题。

## 解决方案

### 方法1：手动清理缓存（推荐）

#### 步骤1：清理localStorage
在浏览器控制台中执行以下代码：

```javascript
// 清理缓存并测试票据显示
console.log('🧹 清理缓存并测试票据显示...');

// 步骤1：清理浏览器缓存
console.log('步骤1：清理浏览器缓存...');
try {
  // 清理localStorage中的旧数据
  localStorage.removeItem('purchaseRecords');
  localStorage.removeItem('localUsers');
  console.log('✅ localStorage已清理');
} catch (error) {
  console.error('❌ 清理localStorage失败:', error);
}

// 步骤2：重新创建测试数据
console.log('步骤2：重新创建测试数据...');

// 创建用户数据
const testUser = {
  id: '1761264732205',
  email: 'taoliu0711@gmail.com',
  name: 'TAO LIU',
  age: 25,
  createdAt: new Date().toISOString(),
  tickets: [
    {
      id: 'ticket_1',
      eventName: '11',
      ticketType: '1',
      price: '12.00',
      purchaseDate: new Date().toLocaleDateString('en-US'),
      status: 'valid',
      customerEmail: 'taoliu0711@gmail.com',
      sessionId: 'cs_test_1',
      qrCode: JSON.stringify({
        ticketId: 'ticket_1',
        eventName: '11',
        ticketType: '1',
        purchaseDate: new Date().toLocaleDateString('en-US'),
        price: '12.00',
        customerEmail: 'taoliu0711@gmail.com'
      })
    },
    {
      id: 'ticket_2',
      eventName: '11',
      ticketType: '1',
      price: '12.00',
      purchaseDate: new Date().toLocaleDateString('en-US'),
      status: 'valid',
      customerEmail: 'taoliu0711@gmail.com',
      sessionId: 'cs_test_2',
      qrCode: JSON.stringify({
        ticketId: 'ticket_2',
        eventName: '11',
        ticketType: '1',
        purchaseDate: new Date().toLocaleDateString('en-US'),
        price: '12.00',
        customerEmail: 'taoliu0711@gmail.com'
      })
    }
  ]
};

// 创建购买记录
const testPurchaseRecords = [
  {
    id: 'purchase_1',
    orderId: 'order_1',
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
    merchantId: 'merchant_123',
    tickets: [{
      id: 'ticket_1',
      shortId: 'TKT001',
      tier: '1',
      status: 'valid',
      qrPayload: JSON.stringify({ ticketId: 'ticket_1' })
    }]
  },
  {
    id: 'purchase_2',
    orderId: 'order_2',
    sessionId: 'cs_test_2',
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
    merchantId: 'merchant_123',
    tickets: [{
      id: 'ticket_2',
      shortId: 'TKT002',
      tier: '1',
      status: 'valid',
      qrPayload: JSON.stringify({ ticketId: 'ticket_2' })
    }]
  }
];

// 保存到localStorage
localStorage.setItem('localUsers', JSON.stringify([testUser]));
localStorage.setItem('purchaseRecords', JSON.stringify(testPurchaseRecords));

console.log('✅ 测试数据已创建');
console.log('📊 用户数量:', 1);
console.log('📊 购买记录数量:', 2);

// 步骤3：验证数据
console.log('步骤3：验证数据...');
const storedUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
const storedPurchases = JSON.parse(localStorage.getItem('purchaseRecords') || '[]');

console.log('📊 存储的用户数据:', storedUsers.length);
console.log('📊 存储的购买记录:', storedPurchases.length);

if (storedUsers.length > 0) {
  console.log('✅ 用户数据:', storedUsers[0].email, '票据数量:', storedUsers[0].tickets.length);
}

if (storedPurchases.length > 0) {
  console.log('✅ 购买记录:', storedPurchases.length, '条');
}

console.log('🎉 缓存清理完成！');
```

#### 步骤2：强制刷新页面
1. **按 Ctrl+F5** 强制刷新页面
2. 或者按 **F12** 打开开发者工具，右键刷新按钮选择"清空缓存并硬性重新加载"
3. 或者按 **Ctrl+Shift+R** 强制刷新

#### 步骤3：验证页面显示
访问以下页面并检查数据是否正确显示：

1. **个人账户页面**: `http://localhost:3000/account`
   - 检查"My Tickets"部分是否显示票据
   - 应该看到活动名称为"11"的票据

2. **商家购买页面**: `http://localhost:3000/merchant/purchases`
   - 检查是否显示购买记录
   - 应该看到客户邮箱为"taoliu0711@gmail.com"的购买记录

3. **管理员界面**: `http://localhost:3000/admin/dashboard`
   - 切换到"Customers"标签页
   - 检查是否显示客户数据

### 方法2：使用开发者工具清理缓存

#### 步骤1：打开开发者工具
- 按 **F12** 或右键选择"检查"

#### 步骤2：清理缓存
1. 在开发者工具中，切换到 **Application** 标签页
2. 在左侧面板中找到 **Storage** 部分
3. 点击 **Clear storage**
4. 点击 **Clear site data** 按钮

#### 步骤3：重新创建数据
运行上面的测试脚本重新创建数据

### 方法3：使用无痕模式测试

#### 步骤1：打开无痕窗口
- 按 **Ctrl+Shift+N** 打开无痕窗口

#### 步骤2：访问页面
- 访问 `http://localhost:3000`
- 运行测试脚本创建数据
- 检查页面显示

## 故障排除

### 如果数据仍然不显示：

1. **检查控制台错误**
   ```javascript
   console.log('当前localStorage数据:', {
     localUsers: JSON.parse(localStorage.getItem('localUsers') || '[]'),
     purchaseRecords: JSON.parse(localStorage.getItem('purchaseRecords') || '[]')
   });
   ```

2. **检查页面加载状态**
   - 确保页面完全加载
   - 检查网络请求是否成功
   - 查看控制台是否有JavaScript错误

3. **检查用户登录状态**
   ```javascript
   console.log('用户登录状态:', localStorage.getItem('userData'));
   ```

4. **手动触发数据加载**
   - 刷新页面
   - 重新登录
   - 重新访问账户页面

## 预期结果

清理缓存后应该看到：
- ✅ 个人账户页面显示票据历史
- ✅ 商家购买页面显示购买记录
- ✅ 管理员界面客户管理显示客户数据
- ✅ 数据在各个页面之间保持同步

## 注意事项

- 清理缓存会删除所有临时数据
- 测试数据会在脚本执行后重新创建
- 如果问题仍然存在，可能需要检查代码逻辑
- 建议使用无痕模式进行测试以避免缓存干扰
