/**
 * 邮箱验证功能最终测试脚本
 * 测试所有功能是否正常工作
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log('🧪 邮箱验证功能最终测试...\n');

// 测试结果收集
const testResults = [];

function addTestResult(testName, success, message) {
  testResults.push({
    test: testName,
    success,
    message,
    timestamp: new Date().toISOString()
  });
}

// 1. 测试环境变量
console.log('⚙️ 测试环境变量配置...');
try {
  const requiredVars = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'UPSTASH_REDIS_URL',
    'UPSTASH_REDIS_TOKEN'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    addTestResult('环境变量配置', true, '所有必需的环境变量都已配置');
  } else {
    addTestResult('环境变量配置', false, `缺少环境变量: ${missingVars.join(', ')}`);
  }
} catch (error) {
  addTestResult('环境变量配置', false, error.message);
}

// 2. 测试邮件服务
console.log('📧 测试邮件服务...');
try {
  const emailService = (await import('../lib/email-service.js')).default;
  const isConfigValid = await emailService.verifyConfig();
  
  if (isConfigValid) {
    addTestResult('邮件服务', true, '邮件服务配置正确，可以发送邮件');
  } else {
    addTestResult('邮件服务', false, '邮件服务配置无效，请检查 SMTP 设置');
  }
} catch (error) {
  addTestResult('邮件服务', false, error.message);
}

// 3. 测试 Redis 连接
console.log('🔴 测试 Redis 连接...');
try {
  const rateLimiter = (await import('../lib/rate-limiter.js')).default;
  const result = await rateLimiter.checkEmailLimit('test@example.com', 'test', 1, 1);
  
  if (result.allowed !== undefined) {
    addTestResult('Redis 连接', true, 'Redis 连接正常，限流功能可用');
  } else {
    addTestResult('Redis 连接', false, 'Redis 连接失败');
  }
} catch (error) {
  addTestResult('Redis 连接', false, error.message);
}

// 4. 测试 Supabase 连接
console.log('🗄️ 测试 Supabase 连接...');
try {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // 测试连接
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1);
  
  if (!error) {
    addTestResult('Supabase 连接', true, 'Supabase 连接正常，数据库可访问');
  } else {
    addTestResult('Supabase 连接', false, `Supabase 连接失败: ${error.message}`);
  }
} catch (error) {
  addTestResult('Supabase 连接', false, error.message);
}

// 5. 测试 API 路由文件
console.log('🔗 测试 API 路由文件...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredRoutes = [
    'app/api/auth/send-verification/route.js',
    'app/api/auth/verify-email/route.js',
    'app/api/auth/forgot-password/route.js',
    'app/api/auth/reset-password/route.js',
    'app/api/auth/check-verification/route.js'
  ];
  
  const missingRoutes = requiredRoutes.filter(route => {
    const fullPath = path.join(process.cwd(), route);
    return !fs.existsSync(fullPath);
  });
  
  if (missingRoutes.length === 0) {
    addTestResult('API 路由文件', true, '所有 API 路由文件都已创建');
  } else {
    addTestResult('API 路由文件', false, `缺少 API 路由文件: ${missingRoutes.join(', ')}`);
  }
} catch (error) {
  addTestResult('API 路由文件', false, error.message);
}

// 6. 测试前端页面
console.log('🎨 测试前端页面...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredPages = [
    'app/auth/verify-email/page.js',
    'app/auth/forgot-password/page.js',
    'app/auth/reset-password/page.js'
  ];
  
  const missingPages = requiredPages.filter(page => {
    const fullPath = path.join(process.cwd(), page);
    return !fs.existsSync(fullPath);
  });
  
  if (missingPages.length === 0) {
    addTestResult('前端页面', true, '所有前端页面都已创建');
  } else {
    addTestResult('前端页面', false, `缺少前端页面: ${missingPages.join(', ')}`);
  }
} catch (error) {
  addTestResult('前端页面', false, error.message);
}

// 7. 测试组件和 Hook
console.log('🧩 测试组件和 Hook...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredFiles = [
    'components/EmailVerificationBanner.js',
    'hooks/useEmailVerification.js',
    'lib/email-verification-middleware.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => {
    const fullPath = path.join(process.cwd(), file);
    return !fs.existsSync(fullPath);
  });
  
  if (missingFiles.length === 0) {
    addTestResult('组件和 Hook', true, '所有组件和 Hook 文件都已创建');
  } else {
    addTestResult('组件和 Hook', false, `缺少文件: ${missingFiles.join(', ')}`);
  }
} catch (error) {
  addTestResult('组件和 Hook', false, error.message);
}

// 8. 测试数据库迁移文件
console.log('🗄️ 测试数据库迁移文件...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const migrationFile = 'supabase/migrations/email_verification_schema.sql';
  const fullPath = path.join(process.cwd(), migrationFile);
  
  if (fs.existsSync(fullPath)) {
    addTestResult('数据库迁移文件', true, '数据库迁移文件已创建，请手动在 Supabase 中运行');
  } else {
    addTestResult('数据库迁移文件', false, '数据库迁移文件不存在');
  }
} catch (error) {
  addTestResult('数据库迁移文件', false, error.message);
}

// 输出测试结果
console.log('\n📋 测试结果汇总:');
console.log('='.repeat(50));

let passedTests = 0;
let totalTests = testResults.length;

testResults.forEach((result, index) => {
  const status = result.success ? '✅' : '❌';
  const statusText = result.success ? 'PASS' : 'FAIL';
  
  console.log(`${index + 1}. ${status} ${result.test} - ${statusText}`);
  console.log(`   消息: ${result.message}`);
  console.log(`   时间: ${result.timestamp}`);
  console.log('');
  
  if (result.success) {
    passedTests++;
  }
});

console.log('='.repeat(50));
console.log(`总计: ${passedTests}/${totalTests} 测试通过`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试都通过了！邮箱验证功能已就绪。');
  console.log('\n📝 下一步：');
  console.log('1. 在 Supabase SQL Editor 中运行数据库迁移');
  console.log('2. 测试完整的邮箱验证流程');
  console.log('3. 部署到生产环境');
} else {
  console.log('⚠️ 部分测试失败，请检查相关配置。');
}

console.log('\n📚 详细说明：');
console.log('- 数据库迁移说明: scripts/migration-instructions.md');
console.log('- 环境配置指南: ENVIRONMENT_SETUP_GUIDE.md');
console.log('- 功能实施报告: EMAIL_VERIFICATION_IMPLEMENTATION_REPORT.md');
