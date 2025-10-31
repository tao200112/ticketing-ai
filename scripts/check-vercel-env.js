const fs = require('fs');
const path = require('path');

console.log('🔍 检查 Vercel 环境变量配置...\n');

// 读取环境变量模板
const envTemplate = fs.readFileSync('env.template', 'utf8');
const lines = envTemplate.split('\n');

console.log('📋 必需的环境变量列表：\n');

const requiredVars = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'SENTRY_DSN'
];

requiredVars.forEach(varName => {
  const line = lines.find(l => l.startsWith(varName));
  if (line) {
    const [key, value] = line.split('=');
    const status = value && value !== 'your-' && value !== '' ? '✅' : '❌';
    console.log(`${status} ${key}=${value || 'NOT SET'}`);
  } else {
    console.log(`❌ ${varName}=NOT FOUND IN TEMPLATE`);
  }
});

console.log('\n🔧 Vercel 环境变量配置指南：');
console.log('1. 登录 Vercel Dashboard');
console.log('2. 选择项目 ticketing-ai');
console.log('3. 进入 Settings > Environment Variables');
console.log('4. 添加以下变量：\n');

const vercelEnvVars = {
  'NEXT_PUBLIC_SITE_URL': 'https://ticketing-ai-six.vercel.app',
  'NEXT_PUBLIC_SUPABASE_URL': 'https://htaqcvnyipiqdbmvvfvj.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5K_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM',
  'SMTP_HOST': 'smtp.gmail.com',
  'SMTP_PORT': '587',
  'SMTP_USER': 'taoliu001711@gmail.com',
  'SMTP_PASS': 'dmtq zgus ljgq grez',
  'UPSTASH_REDIS_URL': 'https://teaching-piglet-24936.upstash.io',
  'UPSTASH_REDIS_TOKEN': 'AWFoAAIncDI1NTFhNzhmODljZTY0ZDk0YmU0YzNiY2EwZDMyYjY3ZHAyMjQ5MzY',
  'SENTRY_DSN': 'https://o1336925.ingest.sentry.io/6606312',
  'MERCHANT_ID': 'default-merchant-id' // 添加缺失的 merchantID
};

Object.entries(vercelEnvVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n⚠️  重要提醒：');
console.log('1. 确保所有环境变量都设置为 Production 环境');
console.log('2. 设置完成后，需要重新部署项目');
console.log('3. 检查 Sentry DSN 是否正确配置');
console.log('4. 确保 merchantID 变量已设置');
