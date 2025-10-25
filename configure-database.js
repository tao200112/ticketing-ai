#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 PartyTix 数据库配置向导\n');

// 检查环境变量文件
const envPath = '.env.local';
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 创建环境变量文件...');
  
  const envContent = `# PartyTix Supabase 配置
# 请替换为您的实际 Supabase 配置信息

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 其他配置 (可选)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ 已创建 .env.local 文件');
} else {
  console.log('✅ 环境变量文件已存在');
}

console.log('\n📋 配置步骤：');
console.log('1. 🌐 访问 https://supabase.com/dashboard');
console.log('2. 🆕 创建新项目 (名称: partytix-mvp)');
console.log('3. ⚙️  在 Settings > API 中获取配置信息');
console.log('4. ✏️  编辑 .env.local 文件，填入您的 Supabase 配置');
console.log('5. 🗄️  在 Supabase SQL Editor 中运行 database-setup.sql');
console.log('6. 🔄 重启应用程序: npm run dev');

console.log('\n🔍 验证配置：');
console.log('1. 访问: http://localhost:3000/admin/dashboard');
console.log('2. 检查是否显示真实数据（不是示例数据）');
console.log('3. 如果显示错误，检查环境变量配置');

console.log('\n📚 详细说明请查看: SUPABASE_SETUP_GUIDE.md');

// 检查当前配置状态
if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('https://') && !envContent.includes('your-project-id');
  const hasSupabaseAnonKey = envContent.includes('eyJ') && !envContent.includes('your_anon_key_here');
  const hasServiceRoleKey = envContent.includes('eyJ') && !envContent.includes('your_service_role_key_here');

  if (hasSupabaseUrl && hasSupabaseAnonKey && hasServiceRoleKey) {
    console.log('\n✅ Supabase 配置已设置！');
    console.log('🎉 现在可以运行应用程序并查看真实数据了！');
    console.log('\n📋 下一步：');
    console.log('1. 在 Supabase SQL Editor 中运行 database-setup.sql');
    console.log('2. 重启应用程序: npm run dev');
    console.log('3. 访问管理员界面查看真实数据');
  } else {
    console.log('\n⚠️  请先配置 Supabase 环境变量');
    console.log('📝 编辑 .env.local 文件，填入您的 Supabase 配置信息');
    console.log('\n🔧 需要的配置：');
    console.log('- NEXT_PUBLIC_SUPABASE_URL: 您的 Supabase 项目 URL');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY: 您的 anon 密钥');
    console.log('- SUPABASE_SERVICE_ROLE_KEY: 您的 service_role 密钥');
  }
}
