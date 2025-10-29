/**
 * 邮箱验证功能简化测试脚本
 * 测试代码逻辑，不依赖外部服务
 */

console.log('🧪 开始邮箱验证功能简化测试...\n');

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

// 1. 测试错误码定义
console.log('📋 测试错误码定义...');
try {
  const { ERROR_CODES } = await import('../lib/error-codes.js');
  
  const requiredCodes = [
    'AUTH_004', // 请求过于频繁
    'AUTH_005', // 邮箱已验证
    'AUTH_006'  // 需要验证邮箱
  ];
  
  const missingCodes = requiredCodes.filter(code => !ERROR_CODES[code]);
  
  if (missingCodes.length > 0) {
    throw new Error(`缺少错误码: ${missingCodes.join(', ')}`);
  }
  
  addTestResult('错误码定义', true, '所有必需的错误码都已定义');
} catch (error) {
  addTestResult('错误码定义', false, error.message);
}

// 2. 测试限流服务类结构
console.log('🚦 测试限流服务类结构...');
try {
  const rateLimiterModule = await import('../lib/rate-limiter.js');
  const rateLimiter = rateLimiterModule.default;
  
  const requiredMethods = [
    'checkLimit',
    'checkIPLimit', 
    'checkEmailLimit',
    'checkActionLimit',
    'getLimitStatus',
    'resetLimit'
  ];
  
  const missingMethods = requiredMethods.filter(method => typeof rateLimiter[method] !== 'function');
  
  if (missingMethods.length > 0) {
    throw new Error(`缺少方法: ${missingMethods.join(', ')}`);
  }
  
  addTestResult('限流服务类结构', true, '所有必需的方法都已定义');
} catch (error) {
  addTestResult('限流服务类结构', false, error.message);
}

// 3. 测试邮件服务类结构
console.log('📧 测试邮件服务类结构...');
try {
  const emailServiceModule = await import('../lib/email-service.js');
  const emailService = emailServiceModule.default;
  
  const requiredMethods = [
    'sendVerificationEmail',
    'sendPasswordResetEmail',
    'verifyConfig'
  ];
  
  const missingMethods = requiredMethods.filter(method => typeof emailService[method] !== 'function');
  
  if (missingMethods.length > 0) {
    throw new Error(`缺少方法: ${missingMethods.join(', ')}`);
  }
  
  addTestResult('邮件服务类结构', true, '所有必需的方法都已定义');
} catch (error) {
  addTestResult('邮件服务类结构', false, error.message);
}

// 4. 测试邮箱验证中间件
console.log('🛡️ 测试邮箱验证中间件...');
try {
  const middlewareModule = await import('../lib/email-verification-middleware.js');
  
  const requiredFunctions = [
    'checkEmailVerification',
    'withEmailVerification',
    'requiresEmailVerification',
    'getVerificationMessage'
  ];
  
  const missingFunctions = requiredFunctions.filter(func => typeof middlewareModule[func] !== 'function');
  
  if (missingFunctions.length > 0) {
    throw new Error(`缺少函数: ${missingFunctions.join(', ')}`);
  }
  
  addTestResult('邮箱验证中间件', true, '所有必需的函数都已定义');
} catch (error) {
  addTestResult('邮箱验证中间件', false, error.message);
}

// 5. 测试 API 路由文件存在
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
  
  if (missingRoutes.length > 0) {
    throw new Error(`缺少 API 路由文件: ${missingRoutes.join(', ')}`);
  }
  
  addTestResult('API 路由文件', true, '所有必需的 API 路由文件都已创建');
} catch (error) {
  addTestResult('API 路由文件', false, error.message);
}

// 6. 测试前端页面文件存在
console.log('🎨 测试前端页面文件...');
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
  
  if (missingPages.length > 0) {
    throw new Error(`缺少前端页面文件: ${missingPages.join(', ')}`);
  }
  
  addTestResult('前端页面文件', true, '所有必需的前端页面文件都已创建');
} catch (error) {
  addTestResult('前端页面文件', false, error.message);
}

// 7. 测试组件和 Hook 文件
console.log('🧩 测试组件和 Hook 文件...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredFiles = [
    'components/EmailVerificationBanner.js',
    'hooks/useEmailVerification.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => {
    const fullPath = path.join(process.cwd(), file);
    return !fs.existsSync(fullPath);
  });
  
  if (missingFiles.length > 0) {
    throw new Error(`缺少组件文件: ${missingFiles.join(', ')}`);
  }
  
  addTestResult('组件和 Hook 文件', true, '所有必需的组件和 Hook 文件都已创建');
} catch (error) {
  addTestResult('组件和 Hook 文件', false, error.message);
}

// 8. 测试数据库迁移文件
console.log('🗄️ 测试数据库迁移文件...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const migrationFile = 'supabase/migrations/email_verification_schema.sql';
  const fullPath = path.join(process.cwd(), migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error('数据库迁移文件不存在');
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const requiredElements = [
    'email_verified_at',
    'reset_token_hash',
    'rate_limits',
    'email_verification_logs',
    'send_verification_email',
    'send_password_reset_email'
  ];
  
  const missingElements = requiredElements.filter(element => !content.includes(element));
  
  if (missingElements.length > 0) {
    throw new Error(`迁移文件缺少元素: ${missingElements.join(', ')}`);
  }
  
  addTestResult('数据库迁移文件', true, '数据库迁移文件包含所有必需的元素');
} catch (error) {
  addTestResult('数据库迁移文件', false, error.message);
}

// 9. 测试环境变量模板
console.log('⚙️ 测试环境变量模板...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const envTemplateFile = 'env.template';
  const fullPath = path.join(process.cwd(), envTemplateFile);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error('环境变量模板文件不存在');
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'UPSTASH_REDIS_URL',
    'UPSTASH_REDIS_TOKEN'
  ];
  
  const missingVars = requiredVars.filter(varName => !content.includes(varName));
  
  if (missingVars.length > 0) {
    throw new Error(`环境变量模板缺少变量: ${missingVars.join(', ')}`);
  }
  
  addTestResult('环境变量模板', true, '环境变量模板包含所有必需的变量');
} catch (error) {
  addTestResult('环境变量模板', false, error.message);
}

// 10. 测试文档文件
console.log('📚 测试文档文件...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const docFile = 'docs/EMAIL_VERIFICATION_GUIDE.md';
  const fullPath = path.join(process.cwd(), docFile);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error('文档文件不存在');
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const requiredSections = [
    '# 邮箱验证功能指南',
    '## 技术架构',
    '## API 接口',
    '## 部署步骤'
  ];
  
  const missingSections = requiredSections.filter(section => !content.includes(section));
  
  if (missingSections.length > 0) {
    throw new Error(`文档缺少章节: ${missingSections.join(', ')}`);
  }
  
  addTestResult('文档文件', true, '文档文件包含所有必需的章节');
} catch (error) {
  addTestResult('文档文件', false, error.message);
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
  console.log('🎉 所有测试都通过了！邮箱验证功能代码结构完整。');
  console.log('\n📝 下一步：');
  console.log('1. 配置环境变量（SMTP 和 Redis）');
  console.log('2. 运行数据库迁移');
  console.log('3. 测试完整功能');
} else {
  console.log('⚠️ 部分测试失败，请检查相关文件。');
}
