#!/usr/bin/env node

/**
 * 环境变量配置脚本
 * 帮助用户正确配置Supabase环境变量
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Supabase环境变量配置助手\n');

// 检查现有环境变量文件
const envFiles = ['.env.local', '.env', '.env.development'];
let existingEnvFile = null;

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    existingEnvFile = file;
    break;
  }
}

console.log('1️⃣ 检查现有环境变量文件...');
if (existingEnvFile) {
  console.log(`   ✅ 找到环境变量文件: ${existingEnvFile}`);
} else {
  console.log('   ⚠️ 未找到环境变量文件，将创建 .env.local');
  existingEnvFile = '.env.local';
}

// 读取现有配置
let existingConfig = {};
if (fs.existsSync(existingEnvFile)) {
  const content = fs.readFileSync(existingEnvFile, 'utf8');
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      existingConfig[key.trim()] = value.trim();
    }
  });
}

// 默认配置
const defaultConfig = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_SUPABASE_URL: 'https://htaqcvnyipiqdbmvvfvj.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw',
  SUPABASE_SERVICE_ROLE_KEY: 'YOUR_SERVICE_ROLE_KEY_HERE',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  STRIPE_SECRET_KEY: 'sk_test_your_stripe_secret_key',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_publishable_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_secret',
  SERVER_SALT: 'change_me_later'
};

console.log('\n2️⃣ 当前环境变量状态:');
Object.entries(defaultConfig).forEach(([key, defaultValue]) => {
  const currentValue = existingConfig[key];
  if (currentValue && currentValue !== defaultValue) {
    console.log(`   ✅ ${key}: 已配置`);
  } else if (currentValue === defaultValue) {
    console.log(`   ⚠️ ${key}: 使用默认值（需要更新）`);
  } else {
    console.log(`   ❌ ${key}: 未配置`);
  }
});

// 生成环境变量文件内容
console.log('\n3️⃣ 生成环境变量配置...');
const envContent = `# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=${existingConfig.NEXT_PUBLIC_SUPABASE_URL || defaultConfig.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${existingConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${existingConfig.SUPABASE_SERVICE_ROLE_KEY || defaultConfig.SUPABASE_SERVICE_ROLE_KEY}

# 应用配置
NODE_ENV=${existingConfig.NODE_ENV || defaultConfig.NODE_ENV}
NEXT_PUBLIC_SITE_URL=${existingConfig.NEXT_PUBLIC_SITE_URL || defaultConfig.NEXT_PUBLIC_SITE_URL}
SERVER_SALT=${existingConfig.SERVER_SALT || defaultConfig.SERVER_SALT}

# Stripe配置（可选）
STRIPE_SECRET_KEY=${existingConfig.STRIPE_SECRET_KEY || defaultConfig.STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${existingConfig.STRIPE_PUBLISHABLE_KEY || defaultConfig.STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${existingConfig.STRIPE_WEBHOOK_SECRET || defaultConfig.STRIPE_WEBHOOK_SECRET}
`;

// 写入文件
fs.writeFileSync(existingEnvFile, envContent);
console.log(`   ✅ 环境变量文件已更新: ${existingEnvFile}`);

console.log('\n4️⃣ 重要提醒:');
console.log('   🔑 请从Supabase项目设置中获取正确的SUPABASE_SERVICE_ROLE_KEY');
console.log('   🔗 Supabase项目地址: https://supabase.com/dashboard/project/htaqcvnyipiqdbmvvfvj');
console.log('   📋 步骤:');
console.log('      1. 登录Supabase Dashboard');
console.log('      2. 选择项目 htaqcvnyipiqdbmvvfvj');
console.log('      3. 进入 Settings > API');
console.log('      4. 复制 Service Role Key');
console.log('      5. 更新 .env.local 文件中的 SUPABASE_SERVICE_ROLE_KEY');

console.log('\n5️⃣ 验证配置:');
console.log('   运行以下命令验证配置:');
console.log('   node fix-403-error.js');

console.log('\n🎉 环境变量配置完成！');
