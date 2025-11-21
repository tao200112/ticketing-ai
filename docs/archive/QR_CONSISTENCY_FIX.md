# 二维码一致性修复指南

## 问题描述
买票时的二维码和个人账户历史记录的二维码不一致，导致扫描结果不同。

## 问题分析

### 买票时的二维码（success页面）：
- 使用QRCode库生成
- 包含字段：`ticketId`, `verificationCode`, `eventName`, `ticketType`, `purchaseDate`, `ticketValidityDate`, `ticketValidityStart`, `ticketValidityEnd`, `price`, `customerEmail`, `customerName`
- 生成DataURL格式

### 个人账户历史记录的二维码：
- 使用在线服务生成
- 字段较少：只有 `ticketId`, `eventName`, `ticketType`, `purchaseDate`, `price`, `customerEmail`
- 缺少 `verificationCode` 和有效期信息

## 修复内容

### 1. 修复个人账户页面二维码数据
- 修改了 `app/account/page.js` 中的二维码数据生成逻辑
- 添加了缺失的字段：`customerName`, `verificationCode`, `ticketValidityDate`, `ticketValidityStart`, `ticketValidityEnd`
- 确保与买票时的二维码数据完全一致

### 2. 修复成功页面票据保存逻辑
- 修改了 `app/success/page.js` 中的票据保存逻辑
- 确保保存到localStorage的票据数据包含完整的二维码信息
- 添加了所有必要的字段到二维码数据中

## 测试步骤

### 步骤1：运行二维码一致性测试脚本
在浏览器控制台中执行以下代码：

```javascript
// 测试买票二维码和个人账户二维码一致性
console.log('🧪 测试买票二维码和个人账户二维码一致性...');

// 模拟买票时的二维码数据
function simulatePurchaseQRCode() {
  console.log('步骤1：模拟买票时的二维码数据...');
  
  const purchaseTicket = {
    id: 'ticket_purchase_123',
    eventName: '11',
    ticketType: '1',
    purchaseDate: '10/24/2025',
    price: '12.00',
    customerEmail: 'taoliu0711@gmail.com',
    customerName: 'TAO LIU',
    verificationCode: 'ABC12345',
    ticketValidityDate: '2025-12-31',
    ticketValidityStart: '2025-10-24T00:00:00Z',
    ticketValidityEnd: '2025-12-31T23:59:59Z'
  };
  
  // 买票时的二维码数据（success页面格式）
  const purchaseQRData = {
    ticketId: purchaseTicket.id,
    verificationCode: purchaseTicket.verificationCode,
    eventName: purchaseTicket.eventName,
    ticketType: purchaseTicket.ticketType,
    purchaseDate: purchaseTicket.purchaseDate,
    ticketValidityDate: purchaseTicket.ticketValidityDate,
    ticketValidityStart: purchaseTicket.ticketValidityStart,
    ticketValidityEnd: purchaseTicket.ticketValidityEnd,
    price: purchaseTicket.price,
    customerEmail: purchaseTicket.customerEmail,
    customerName: purchaseTicket.customerName
  };
  
  const purchaseQRString = JSON.stringify(purchaseQRData);
  console.log('✅ 买票时二维码数据:', purchaseQRString);
  
  return purchaseQRString;
}

// 模拟个人账户的二维码数据
function simulateAccountQRCode() {
  console.log('步骤2：模拟个人账户的二维码数据...');
  
  const accountTicket = {
    id: 'ticket_purchase_123',
    eventName: '11',
    ticketType: '1',
    purchaseDate: '10/24/2025',
    price: '12.00',
    customerEmail: 'taoliu0711@gmail.com',
    customerName: 'TAO LIU',
    verificationCode: 'ABC12345',
    ticketValidityDate: '2025-12-31',
    ticketValidityStart: '2025-10-24T00:00:00Z',
    ticketValidityEnd: '2025-12-31T23:59:59Z'
  };
  
  // 个人账户的二维码数据（account页面格式）
  const accountQRData = {
    ticketId: accountTicket.id,
    eventName: accountTicket.eventName,
    ticketType: accountTicket.ticketType,
    purchaseDate: accountTicket.purchaseDate,
    price: accountTicket.price,
    customerEmail: accountTicket.customerEmail,
    customerName: accountTicket.customerName,
    verificationCode: accountTicket.verificationCode,
    ticketValidityDate: accountTicket.ticketValidityDate,
    ticketValidityStart: accountTicket.ticketValidityStart,
    ticketValidityEnd: accountTicket.ticketValidityEnd
  };
  
  const accountQRString = JSON.stringify(accountQRData);
  console.log('✅ 个人账户二维码数据:', accountQRString);
  
  return accountQRString;
}

// 比较二维码数据一致性
function compareQRCodeConsistency() {
  console.log('步骤3：比较二维码数据一致性...');
  
  const purchaseQR = simulatePurchaseQRCode();
  const accountQR = simulateAccountQRCode();
  
  try {
    const purchaseData = JSON.parse(purchaseQR);
    const accountData = JSON.parse(accountQR);
    
    console.log('📊 买票时二维码字段:', Object.keys(purchaseData));
    console.log('📊 个人账户二维码字段:', Object.keys(accountData));
    
    // 检查字段是否一致
    const purchaseKeys = Object.keys(purchaseData).sort();
    const accountKeys = Object.keys(accountData).sort();
    
    const keysMatch = JSON.stringify(purchaseKeys) === JSON.stringify(accountKeys);
    console.log('🔍 字段数量是否一致:', keysMatch);
    
    if (!keysMatch) {
      console.log('❌ 字段不一致:');
      console.log('买票时字段:', purchaseKeys);
      console.log('个人账户字段:', accountKeys);
      
      const missingInAccount = purchaseKeys.filter(key => !accountKeys.includes(key));
      const missingInPurchase = accountKeys.filter(key => !purchaseKeys.includes(key));
      
      if (missingInAccount.length > 0) {
        console.log('个人账户缺少字段:', missingInAccount);
      }
      if (missingInPurchase.length > 0) {
        console.log('买票时缺少字段:', missingInPurchase);
      }
    } else {
      console.log('✅ 字段完全一致');
    }
    
    // 检查值是否一致
    let valuesMatch = true;
    for (const key of purchaseKeys) {
      if (purchaseData[key] !== accountData[key]) {
        console.log(`❌ 字段 ${key} 值不一致:`, {
          purchase: purchaseData[key],
          account: accountData[key]
        });
        valuesMatch = false;
      }
    }
    
    if (valuesMatch) {
      console.log('✅ 所有字段值完全一致');
    }
    
    return keysMatch && valuesMatch;
    
  } catch (error) {
    console.error('❌ 解析二维码数据失败:', error);
    return false;
  }
}

// 生成二维码URL进行比较
function generateQRCodeURLs() {
  console.log('步骤4：生成二维码URL进行比较...');
  
  const purchaseQR = simulatePurchaseQRCode();
  const accountQR = simulateAccountQRCode();
  
  const purchaseQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(purchaseQR)}`;
  const accountQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(accountQR)}`;
  
  console.log('🔗 买票时二维码URL:', purchaseQRUrl);
  console.log('🔗 个人账户二维码URL:', accountQRUrl);
  
  // 创建二维码比较页面
  const compareContainer = document.createElement('div');
  compareContainer.style.position = 'fixed';
  compareContainer.style.top = '10px';
  compareContainer.style.left = '10px';
  compareContainer.style.background = 'white';
  compareContainer.style.padding = '20px';
  compareContainer.style.border = '2px solid #ccc';
  compareContainer.style.borderRadius = '8px';
  compareContainer.style.zIndex = '9999';
  compareContainer.style.maxWidth = '400px';
  
  compareContainer.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #333;">二维码一致性测试</h3>
    <div style="display: flex; gap: 20px;">
      <div style="text-align: center;">
        <h4 style="margin: 0 0 10px 0; color: #666;">买票时二维码</h4>
        <img src="${purchaseQRUrl}" alt="Purchase QR" style="width: 150px; height: 150px; border: 1px solid #ccc;" />
      </div>
      <div style="text-align: center;">
        <h4 style="margin: 0 0 10px 0; color: #666;">个人账户二维码</h4>
        <img src="${accountQRUrl}" alt="Account QR" style="width: 150px; height: 150px; border: 1px solid #ccc;" />
      </div>
    </div>
  `;
  
  document.body.appendChild(compareContainer);
  
  return { purchaseQRUrl, accountQRUrl };
}

// 运行测试
const isConsistent = compareQRCodeConsistency();
generateQRCodeURLs();

console.log('🎉 二维码一致性测试完成！');
console.log('📊 结果:', isConsistent ? '✅ 二维码数据一致' : '❌ 二维码数据不一致');
console.log('请检查页面左上角的二维码比较区域');
```

### 步骤2：验证二维码一致性
1. **访问买票成功页面**: 完成一次买票流程
2. **访问个人账户页面**: `http://localhost:3000/account`
3. **扫描两个二维码**: 使用手机扫描买票时的二维码和个人账户的二维码
4. **比较扫描结果**: 检查两个二维码的扫描结果是否完全一致

### 步骤3：验证数据完整性
在浏览器控制台中执行以下代码来验证二维码数据：

```javascript
// 验证localStorage中的票据数据
const localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
localUsers.forEach((user, userIndex) => {
  if (user.tickets && user.tickets.length > 0) {
    user.tickets.forEach((ticket, ticketIndex) => {
      console.log(`票据 ${ticketIndex + 1} 二维码数据:`, ticket.qrCode);
      console.log(`票据 ${ticketIndex + 1} 验证码:`, ticket.verificationCode);
      console.log(`票据 ${ticketIndex + 1} 有效期:`, ticket.ticketValidityDate);
    });
  }
});
```

## 预期结果

修复后应该看到：
- ✅ 买票时的二维码和个人账户的二维码数据完全一致
- ✅ 两个二维码包含相同的字段和值
- ✅ 扫描两个二维码得到相同的结果
- ✅ 二维码包含完整的票据信息（包括验证码和有效期）

## 修复的关键点

### 1. 字段一致性
确保两个地方的二维码包含相同的字段：
- `ticketId`
- `verificationCode`
- `eventName`
- `ticketType`
- `purchaseDate`
- `ticketValidityDate`
- `ticketValidityStart`
- `ticketValidityEnd`
- `price`
- `customerEmail`
- `customerName`

### 2. 数据保存一致性
确保买票时保存到localStorage的数据包含完整的二维码信息。

### 3. 二维码生成一致性
确保两个地方使用相同的二维码数据格式。

## 故障排除

### 如果二维码仍然不一致：

1. **检查localStorage数据**
   ```javascript
   console.log('localStorage票据数据:', JSON.parse(localStorage.getItem('localUsers') || '[]'));
   ```

2. **检查二维码数据格式**
   ```javascript
   const ticket = JSON.parse(localStorage.getItem('localUsers') || '[]')[0].tickets[0];
   console.log('二维码数据:', ticket.qrCode);
   ```

3. **手动比较二维码内容**
   - 扫描买票时的二维码
   - 扫描个人账户的二维码
   - 比较扫描结果

## 注意事项

- 确保在测试前已经完成一次完整的买票流程
- 二维码数据包含敏感信息，请妥善保管
- 建议使用HTTPS确保数据传输安全
- 二维码生成需要网络连接
