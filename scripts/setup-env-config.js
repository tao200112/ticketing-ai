/**
 * 环境变量配置脚本
 * 自动创建 .env.local 文件
 */

import fs from 'fs';
import path from 'path';

const envConfig = `# ===========================================
# 基础配置
# ===========================================
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=https://ticketing-ai-six.vercel.app

# ===========================================
# Supabase 配置
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://htaqcvnyipiqdbmvvfvj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3NjA5OCwiZXhwIjoyMDc2NjUyMDk4fQ.84ZGW8t9veGNDJwvy-grFeOa67jtsp1UMLFRcw5hEKM

# ===========================================
# Sentry 配置
# ===========================================
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn
SENTRY_DSN=your-backend-sentry-dsn

# ===========================================
# 邮件配置
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=taoliu001711@gmail.com
SMTP_PASS=dmtq zgus ljgq grez

# ===========================================
# Redis 限流配置
# ===========================================
UPSTASH_REDIS_URL=https://teaching-piglet-24936.upstash.io
UPSTASH_REDIS_TOKEN=AWFoAAIncDI1NTFhNzhmODljZTY0ZDk0YmU0YzNiY2EwZDMyYjY3ZHAyMjQ5MzY

# ===========================================
# 其他配置
# ===========================================
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
UPLOAD_MAX_SIZE=10485760
`;

try {
  const envPath = path.join(process.cwd(), '.env.local');
  fs.writeFileSync(envPath, envConfig);
  console.log('✅ .env.local 文件已创建成功！');
  console.log('📧 邮件服务配置：Gmail SMTP');
  console.log('🔴 Redis 服务配置：Upstash Redis');
  console.log('🌐 网站地址：https://ticketing-ai-six.vercel.app/');
  console.log('🗄️ 数据库：Supabase');
  console.log('\n🚀 现在可以运行测试了：');
  console.log('npm run test:email-verification-simple');
} catch (error) {
  console.error('❌ 创建 .env.local 文件失败:', error.message);
  console.log('\n📝 请手动创建 .env.local 文件，内容如下：');
  console.log(envConfig);
}
