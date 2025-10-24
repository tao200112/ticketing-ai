const bcrypt = require('bcryptjs');

async function createTestMerchantData() {
  console.log('🔧 Creating test merchant data...');
  
  // 生成测试商户数据
  const testMerchant = {
    id: 'test-merchant-123',
    email: 'test@merchant.com',
    name: 'Test Merchant',
    businessName: 'Test Business',
    phone: '1234567890',
    password: 'test123',
    maxEvents: 10,
    isActive: true,
    verified: true,
    createdAt: new Date().toISOString()
  };

  // 加密密码
  const hashedPassword = await bcrypt.hash(testMerchant.password, 10);
  testMerchant.password_hash = hashedPassword;
  delete testMerchant.password; // 移除明文密码

  console.log('📝 Test merchant data:');
  console.log(JSON.stringify(testMerchant, null, 2));

  // 生成localStorage代码
  console.log('\n🔧 Add this to browser console or use the HTML file:');
  console.log('```javascript');
  console.log('// Add test merchant to localStorage');
  console.log(`const testMerchant = ${JSON.stringify(testMerchant, null, 2)};`);
  console.log('const existingMerchants = JSON.parse(localStorage.getItem("merchantUsers") || "[]");');
  console.log('const updatedMerchants = [...existingMerchants, testMerchant];');
  console.log('localStorage.setItem("merchantUsers", JSON.stringify(updatedMerchants));');
  console.log('console.log("✅ Test merchant added to localStorage");');
  console.log('```');

  // 生成环境变量代码
  console.log('\n🔧 For Vercel environment variables:');
  console.log('MERCHANT_USERS=' + JSON.stringify([testMerchant]));
  
  console.log('\n✅ Test merchant data created successfully!');
}

createTestMerchantData().catch(console.error);
