#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 验证SUPABASE_SERVICE_ROLE_KEY是否正确配置
 */

console.log('🔍 检查环境变量配置...\n');

// 检查环境变量
const envVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL
};

console.log('📋 环境变量状态:');
Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    const maskedValue = key.includes('KEY') ? 
      value.substring(0, 10) + '...' + value.substring(value.length - 10) : 
      value;
    console.log(`   ✅ ${key}: ${maskedValue}`);
  } else {
    console.log(`   ❌ ${key}: 未配置`);
  }
});

console.log('\n🔧 如果SUPABASE_SERVICE_ROLE_KEY未配置，请：');
console.log('   1. 检查.env.local文件是否存在');
console.log('   2. 确保文件中有正确的SUPABASE_SERVICE_ROLE_KEY');
console.log('   3. 重启开发服务器 (npm run dev)');

// 检查.env.local文件
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  console.log('\n📁 找到.env.local文件');
  const content = fs.readFileSync('.env.local', 'utf8');
  const hasServiceKey = content.includes('SUPABASE_SERVICE_ROLE_KEY');
  console.log(`   Service Role Key: ${hasServiceKey ? '✅ 已配置' : '❌ 未找到'}`);
} else {
  console.log('\n❌ 未找到.env.local文件');
  console.log('   请创建.env.local文件并添加必要的环境变量');
}
