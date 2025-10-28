const http = require('http');

console.log('🔍 快速服务测试...\n');

// 测试前端
http.get('http://localhost:3000/', (res) => {
  console.log(`✅ 前端 (3000): ${res.statusCode}`);
}).on('error', (err) => {
  console.log(`❌ 前端 (3000): ${err.message}`);
});

// 测试后端
http.get('http://localhost:3001/health', (res) => {
  console.log(`✅ 后端 (3001): ${res.statusCode}`);
}).on('error', (err) => {
  console.log(`❌ 后端 (3001): ${err.message}`);
});

setTimeout(() => {
  console.log('\n📊 测试完成！');
  process.exit(0);
}, 2000);
