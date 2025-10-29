const { execSync } = require('child_process');

console.log('🚀 强制重新部署到 Vercel...\n');

try {
  // 创建一个空提交来触发重新部署
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit --allow-empty -m "force: 强制重新部署修复路由问题"', { stdio: 'inherit' });
  execSync('git push origin feat/identity-rbac-errors', { stdio: 'inherit' });
  
  console.log('\n✅ 强制重新部署已触发！');
  console.log('📋 请等待 2-3 分钟让 Vercel 完成部署');
  console.log('🔍 然后测试以下页面：');
  console.log('   - https://ticketing-ai-six.vercel.app/api/health');
  console.log('   - https://ticketing-ai-six.vercel.app/api/test-env');
  console.log('   - https://ticketing-ai-six.vercel.app/debug-vercel');
  
} catch (error) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
}
