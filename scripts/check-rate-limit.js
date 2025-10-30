require('dotenv').config({ path: '.env.local' });

console.log('🔍 检查限流状态...\n');

// 模拟检查限流
const testEmail = 'test@example.com';
const testIP = '127.0.0.1';

console.log('📧 测试邮箱:', testEmail);
console.log('🌐 测试 IP:', testIP);
console.log('');

// 检查环境变量
console.log('🔧 环境变量检查:');
console.log('UPSTASH_REDIS_URL:', process.env.UPSTASH_REDIS_URL ? '✅ 已设置' : '❌ 未设置');
console.log('UPSTASH_REDIS_TOKEN:', process.env.UPSTASH_REDIS_TOKEN ? '✅ 已设置' : '❌ 未设置');
console.log('');

// 模拟限流检查
console.log('📊 限流规则:');
console.log('- IP 限流: 3 次/15 分钟');
console.log('- 邮箱限流: 2 次/15 分钟');
console.log('');

console.log('💡 建议:');
console.log('1. 检查垃圾邮件文件夹');
console.log('2. 等待 15 分钟后重试');
console.log('3. 使用不同的邮箱地址测试');
console.log('4. 检查邮箱提供商是否阻止了验证邮件');


