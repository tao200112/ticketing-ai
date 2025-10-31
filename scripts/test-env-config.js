/**
 * 环境变量配置测试脚本
 * 验证环境变量是否正确加载
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载 .env.local 文件
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log('🧪 测试环境变量配置...\n');

// 测试必需的环境变量
const requiredEnvVars = {
  'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SMTP_HOST': process.env.SMTP_HOST,
  'SMTP_PORT': process.env.SMTP_PORT,
  'SMTP_USER': process.env.SMTP_USER,
  'SMTP_PASS': process.env.SMTP_PASS,
  'UPSTASH_REDIS_URL': process.env.UPSTASH_REDIS_URL,
  'UPSTASH_REDIS_TOKEN': process.env.UPSTASH_REDIS_TOKEN
};

console.log('📋 环境变量检查结果:');
console.log('='.repeat(50));

let allConfigured = true;

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (key.includes('KEY') || key.includes('TOKEN') ? 
      `${value.substring(0, 20)}...` : value) : 
    '未配置';
  
  console.log(`${status} ${key}: ${displayValue}`);
  
  if (!value) {
    allConfigured = false;
  }
});

console.log('='.repeat(50));

if (allConfigured) {
  console.log('🎉 所有环境变量都已正确配置！');
  console.log('\n📧 邮件服务: Gmail SMTP');
  console.log('🔴 Redis 服务: Upstash Redis');
  console.log('🗄️ 数据库: Supabase');
  console.log('🌐 网站地址: https://ticketing-ai-six.vercel.app/');
  
  console.log('\n🚀 下一步:');
  console.log('1. 运行数据库迁移');
  console.log('2. 测试邮箱验证功能');
} else {
  console.log('⚠️ 部分环境变量未配置，请检查 .env.local 文件');
}

// 测试邮件服务配置
console.log('\n📧 测试邮件服务配置...');
try {
  const emailService = (await import('../lib/email-service.js')).default;
  const isConfigValid = await emailService.verifyConfig();
  console.log(`邮件服务配置: ${isConfigValid ? '✅ 正常' : '❌ 失败'}`);
} catch (error) {
  console.log(`邮件服务配置: ❌ 错误 - ${error.message}`);
}

// 测试 Redis 连接
console.log('\n🔴 测试 Redis 连接...');
try {
  const rateLimiter = (await import('../lib/rate-limiter.js')).default;
  const result = await rateLimiter.checkEmailLimit('test@example.com', 'test', 1, 1);
  console.log(`Redis 连接: ${result.allowed ? '✅ 正常' : '❌ 失败'}`);
} catch (error) {
  console.log(`Redis 连接: ❌ 错误 - ${error.message}`);
}

console.log('\n✨ 环境变量测试完成！');
