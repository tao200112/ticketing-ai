require('dotenv').config({ path: '.env.local' });

console.log('🔍 测试注册流程 - ltao19@vt.edu...\n');

// 模拟注册请求
const registrationData = {
  email: 'ltao19@vt.edu',
  password: 'testpassword123',
  name: 'Test User'
};

console.log('📝 注册数据:');
console.log('邮箱:', registrationData.email);
console.log('密码:', '***已隐藏***');
console.log('姓名:', registrationData.name);
console.log('');

// 检查邮箱格式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = emailRegex.test(registrationData.email);
console.log('📧 邮箱格式验证:', isValidEmail ? '✅ 有效' : '❌ 无效');

// 检查密码长度
const isValidPassword = registrationData.password.length >= 6;
console.log('🔒 密码长度验证:', isValidPassword ? '✅ 有效' : '❌ 无效');

console.log('\n💡 建议:');
console.log('1. 等待 15 分钟后重试注册');
console.log('2. 检查 ltao19@vt.edu 的垃圾邮件文件夹');
console.log('3. 确保没有触发限流');
console.log('4. 如果仍然收不到，尝试使用其他邮箱测试');

console.log('\n🔧 如果问题持续:');
console.log('1. 检查 VT 邮箱设置');
console.log('2. 联系 VT IT 部门');
console.log('3. 尝试使用 Gmail 邮箱测试');


