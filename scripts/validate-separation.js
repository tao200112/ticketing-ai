#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 验证前后端分离状态...\n');

// 需要彻底移除的遗留文件/目录
const deprecatedPaths = [
  'backend/server.js',
  'backend/package.json',
  'lib/api-client.js',
  'lib/hooks/use-api.js',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'Dockerfile.backend',
  'Dockerfile.frontend',
  'railway.json',
  'railway.toml'
];

// 需要存在的关键文件
const requiredPaths = [
  'app/api/stripe/webhook/route.ts',
  'app/api/tickets/generate/route.ts',
  'supabase/functions/validate-ticket/index.ts',
  'supabase/functions/admin-actions/index.ts'
];

let separationStatus = true;
let issues = [];

console.log('🧹 检查遗留文件是否已删除:');
deprecatedPaths.forEach(entry => {
  const targetPath = path.join(process.cwd(), entry);
  if (fs.existsSync(targetPath)) {
    console.log(`  ❌ ${entry} - 仍然存在`);
    separationStatus = false;
    issues.push(`请删除遗留路径: ${entry}`);
  } else {
    console.log(`  ✅ ${entry} 已移除`);
  }
});

console.log('\n🆕 检查关键文件是否存在:');
requiredPaths.forEach(entry => {
  const targetPath = path.join(process.cwd(), entry);
  if (fs.existsSync(targetPath)) {
    console.log(`  ✅ ${entry}`);
  } else {
    console.log(`  ❌ 缺少 ${entry}`);
    separationStatus = false;
    issues.push(`缺少关键文件: ${entry}`);
  }
});



// 总结
console.log('\n📊 分离状态总结:');
if (separationStatus) {
  console.log('  ✅ 前后端分离检查通过');
  console.log('  ✅ 所有 Railway/Railgun 依赖已清理');
  console.log('  ✅ 关键的 Vercel API 与 Supabase Edge Function 文件齐全');
  console.log('\n🎉 前后端分离验证通过！');
} else {
  console.log('  ❌ 前后端分离未完成');
  console.log('\n⚠️  发现的问题:');
  issues.forEach(issue => {
    console.log(`    - ${issue}`);
  });
  console.log('\n🔧 请修复上述问题后重新运行验证');
  process.exit(1);
}
