#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 PartyTix 快速设置向导\n');

// 检查环境变量文件
const envPath = '.env.local';
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 创建环境变量文件...');
  
  const envContent = `# PartyTix 环境配置
# 请替换为您的实际 Supabase 配置

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration (可选)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Database Configuration (可选)
DATABASE_URL=your_database_url_here
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ 已创建 .env.local 文件');
} else {
  console.log('✅ 环境变量文件已存在');
}

console.log('\n📋 设置步骤：');
console.log('1. 访问 https://supabase.com/dashboard');
console.log('2. 创建新项目或使用现有项目');
console.log('3. 在 Settings > API 中获取配置信息');
console.log('4. 编辑 .env.local 文件，填入您的 Supabase 配置');
console.log('5. 在 Supabase SQL Editor 中运行 database-setup.sql');
console.log('6. 重启应用程序');

console.log('\n🔧 快速测试：');
console.log('1. 配置完成后运行: npm run dev');
console.log('2. 访问: http://localhost:3000/admin/dashboard');
console.log('3. 检查是否显示真实数据');

console.log('\n📚 详细说明请查看: ENVIRONMENT_SETUP.md');

// 检查 Supabase 配置
const envContent = fs.readFileSync(envPath, 'utf8');
const hasSupabaseUrl = envContent.includes('your_supabase_project_url_here') === false;
const hasSupabaseAnonKey = envContent.includes('your_supabase_anon_key_here') === false;
const hasServiceRoleKey = envContent.includes('your_supabase_service_role_key_here') === false;

if (hasSupabaseUrl && hasSupabaseAnonKey && hasServiceRoleKey) {
  console.log('\n✅ Supabase 配置已设置！');
  console.log('🎉 现在可以运行应用程序并查看真实数据了！');
} else {
  console.log('\n⚠️  请先配置 Supabase 环境变量');
  console.log('📝 编辑 .env.local 文件，填入您的 Supabase 配置信息');
}
