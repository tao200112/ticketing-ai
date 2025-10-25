#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 PartyTix 数据库配置验证\n');

// 检查环境变量文件
const envPath = '.env.local';
if (!fs.existsSync(envPath)) {
  console.log('❌ 环境变量文件不存在');
  console.log('📝 请先运行: node configure-database.js');
  process.exit(1);
}

// 读取环境变量
const envContent = fs.readFileSync(envPath, 'utf8');

// 检查必要的环境变量
const checks = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    pattern: /NEXT_PUBLIC_SUPABASE_URL=https:\/\/[^\.]+\.supabase\.co/,
    required: true
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    pattern: /NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ/,
    required: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    pattern: /SUPABASE_SERVICE_ROLE_KEY=eyJ/,
    required: true
  }
];

console.log('🔧 环境变量检查：');
let allConfigured = true;

checks.forEach(check => {
  const isConfigured = check.pattern.test(envContent);
  const status = isConfigured ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${isConfigured ? '已配置' : '未配置'}`);
  
  if (!isConfigured && check.required) {
    allConfigured = false;
  }
});

console.log('\n📊 配置状态：');
if (allConfigured) {
  console.log('✅ 所有必要的环境变量已配置');
  console.log('🎉 现在可以测试数据库连接了！');
  
  console.log('\n🧪 测试步骤：');
  console.log('1. 在 Supabase SQL Editor 中运行 real-database-setup.sql');
  console.log('2. 重启应用程序: npm run dev');
  console.log('3. 访问: http://localhost:3000/admin/dashboard');
  console.log('4. 检查是否显示真实数据');
  
  console.log('\n📋 如果显示错误：');
  console.log('- 检查 Supabase 项目是否正常运行');
  console.log('- 验证 API 密钥是否正确');
  console.log('- 确认数据库表已创建');
} else {
  console.log('❌ 环境变量配置不完整');
  console.log('📝 请编辑 .env.local 文件，填入正确的 Supabase 配置');
  
  console.log('\n🔧 配置指南：');
  console.log('1. 访问 https://supabase.com/dashboard');
  console.log('2. 创建新项目或选择现有项目');
  console.log('3. 在 Settings > API 中获取配置信息');
  console.log('4. 更新 .env.local 文件中的配置');
}

console.log('\n📚 详细说明请查看: SUPABASE_SETUP_GUIDE.md');
