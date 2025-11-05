const { execSync } = require('child_process');

console.log('🔍 Vercel 部署诊断...\n');

// 检查当前分支
try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📋 当前分支: ${currentBranch}`);
  
  if (currentBranch !== 'feat/identity-rbac-errors') {
    console.log('⚠️  警告: 当前不在目标分支 feat/identity-rbac-errors');
  }
} catch (error) {
  console.error('❌ 无法获取当前分支:', error.message);
}

// 检查最新提交
try {
  const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
  console.log(`📝 最新提交: ${lastCommit}`);
} catch (error) {
  console.error('❌ 无法获取最新提交:', error.message);
}

// 检查是否有未提交的更改
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    console.log('⚠️  有未提交的更改:');
    console.log(status);
  } else {
    console.log('✅ 工作区干净，无未提交更改');
  }
} catch (error) {
  console.error('❌ 无法检查工作区状态:', error.message);
}

// 检查 API 路由文件是否存在
const fs = require('fs');
const apiRoutes = [
  'app/api/health/route.js',
  'app/api/test-env/route.js',
  'app/api/debug-routes/route.js'
];

console.log('\n📁 检查 API 路由文件:');
apiRoutes.forEach(route => {
  if (fs.existsSync(route)) {
    console.log(`✅ ${route} 存在`);
  } else {
    console.log(`❌ ${route} 不存在`);
  }
});

// 检查环境变量模板
console.log('\n🔧 检查环境变量配置:');
const envTemplate = fs.readFileSync('env.template', 'utf8');
const requiredVars = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_MERCHANT_ID',
  'NEXT_PUBLIC_SITE_URL'
];

requiredVars.forEach(varName => {
  if (envTemplate.includes(varName)) {
    console.log(`✅ ${varName} 在模板中`);
  } else {
    console.log(`❌ ${varName} 不在模板中`);
  }
});

console.log('\n🚀 建议操作:');
console.log('1. 确认 Vercel 环境变量已正确设置');
console.log('2. 在 Vercel Dashboard 中手动触发重新部署');
console.log('3. 检查 Vercel 构建日志是否有错误');
console.log('4. 确认部署的是正确的分支');
