#!/usr/bin/env node

/**
 * 代码库清理脚本
 * 删除未使用的测试、调试文件和整理文档
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const docsArchiveDir = path.join(rootDir, 'docs', 'archive');

// 确保归档目录存在
if (!fs.existsSync(docsArchiveDir)) {
  fs.mkdirSync(docsArchiveDir, { recursive: true });
}

// 要删除的文件模式
const filesToDelete = [
  // 测试文件
  'test-*.js',
  'test-*.html',
  'debug-*.js',
  'debug-*.html',
  'check-*.js',
  'verify-*.js',
  'simple-*.html',
  'add-test-data.html',
  'fix-all-issues.html',
  'run-fix-tool.js',
  'detailed-debug.js',
  'create-test-merchant-data.js',
  'configure-database.js',
  'setup-database.js',
  'setup-env.js',
  'quick-setup.js',
  'list-invite-codes.js',
  'fix-database-data.js',
  'fix-frontend-issues.js',
  'fix-403-error.js',
  
  // 临时文件
  'validation-report-*.json',
  'events.json',
  
  // 重复的Dockerfile
  'Dockerfile.backend.fixed',
  'Dockerfile.backend.no-cache',
  'Dockerfile.backend.simple',
  
  // 根目录下的SQL文件（保留supabase/migrations中的）
  'add-user-id-to-tickets-manual.sql',
  'add-user-id-to-tickets.sql',
  'cleanup-test-events.sql',
  'quick_fix_invite_codes.sql',
  'verify_database.sql',
  'fix-database-schema.sql',
  'fix-rls-policies.sql',
  'fix_users_rls_policies.sql',
  'fix_admin_invite_codes_rls.sql',
  'enable_rls_policies_fixed.sql',
  'database-setup.sql',
  'real-database-setup.sql',
  'create-test-merchant.sql',
  '验证_rls_策略.sql',
  '完整_rls_修复.sql',
  '修复函数搜索路径警告.sql',
  '修复_event_prices_rls.sql',
];

// 要移动到归档的文档
const docsToArchive = [
  // 修复报告
  'ADMIN_CUSTOMERS_FIX.md',
  'ADMIN_LOGIN_FIX.md',
  'AUTH_FIX_SUMMARY.md',
  'AUTH_IMPROVEMENTS_SUMMARY.md',
  'AUTH_UNIFICATION_REPORT.md',
  'AUTHENTICATION_SUMMARY.md',
  'BUGFIX_SUPABASE_UID_MIGRATION.md',
  'Bug修复完成报告.md',
  'CHECKOUT_SESSIONS_AUTH_FIX.md',
  'CI_CD_FIX_REPORT.md',
  'CI_FAILURE_ANALYSIS_AND_SOLUTIONS.md',
  'CODE_OPTIMIZATION_SUMMARY.md',
  'CODE_UPDATE_GUIDE.md',
  'CODEBASE_CLEANUP_COMPLETE_FINAL.md',
  'CODEBASE_CLEANUP_COMPLETE.md',
  'CODEBASE_CLEANUP_FINAL.md',
  'CODEBASE_CLEANUP_REPORT.md',
  'DATABASE_ISSUE_FIX.md',
  'DATABASE_MIGRATION_COMPLETE.md',
  'DATABASE_SCHEMA_FIX.md',
  'DEBUG_OAUTH_ERROR.md',
  'DEBUG_QR_SCAN.md',
  'DISPLAY_FIX_SUMMARY.md',
  'DYNAMIC_ROUTE_FIX_SUMMARY.md',
  'EMAIL_VERIFICATION_IMPLEMENTATION_REPORT.md',
  'EMERGENCY_FIX.md',
  'ERROR_HANDLING_IMPROVEMENTS.md',
  'EVENT_CREATION_FIX_SUMMARY.md',
  'EVENT_CREATION_FIX.md',
  'EVENT_DETAIL_SSR_IMPLEMENTATION.md',
  'FIX_HOLDER_INFO_DISPLAY.md',
  'LOGIN_FIX_SUMMARY.md',
  'MERCHANT_AUTH_REFACTOR_COMPLETE.md',
  'MERCHANT_ID_ERROR_FIX.md',
  'MERCHANT_PURCHASES_FIX.md',
  'MERCHANT_REGISTRATION_DIAGNOSIS.md',
  'MOBILE_QR_SCAN_FIX.md',
  'ONLINE_DATABASE_FIX.md',
  'PASSWORD_HASH_FIX.md',
  'PURCHASE_DATA_FIX.md',
  'QR_CODE_FIX.md',
  'QR_CONSISTENCY_FIX.md',
  'QR_SCAN_ANY_CODE_FIX.md',
  'QR_SCAN_DEBUG_GUIDE.md',
  'QR_SCAN_FIX.md',
  'QUICK_FIX_GUIDE.md',
  'RAILWAY_AUTO_DEPLOY_FIX.md',
  'RAILWAY_DEPLOYMENT_TROUBLESHOOTING.md',
  'RAILWAY_EBUSY_SOLUTION.md',
  'RLS_FIX_COMPLETE.md',
  'RLS_FIX_SUMMARY.md',
  'STRIPE_PAYMENT_FIX_SUMMARY.md',
  'STRIPE_FUNCTIONALITY_RESTORED.md',
  'SUPABASE_CLIENT_FIX_REPORT.md',
  'SUPABASE_CONFIGURATION_AUDIT.md',
  'SUPABASE_CONFIGURATION_DIAGNOSIS.md',
  'SUPABASE_CONFIGURATION_STATUS.md',
  'SUPABASE_UID_FIX_COMPLETE.md',
  'SUPABASE_UID_FIX_DETAILED.md',
  'SUPABASE_UID_NULL_FIX.md',
  'TICKET_ACCOUNT_BINDING_FIX.md',
  'TICKET_REDEMPTIONS_FIX_COMPLETE.md',
  'TICKET_REDEMPTIONS_FIX_SUMMARY.md',
  'TICKET_SAVING_FIX.md',
  'TICKET_SYNC_FIX.md',
  'VERCEL_DEPLOYMENT_FIX.md',
  'VERCEL_FIX.md',
  'WEBHOOK_SUPABASE_UID_FIX.md',
  
  // 总结和状态报告
  'AUDIT.md',
  'ARCHITECTURE_AUDIT_REPORT.md',
  'BUG_AND_ENVIRONMENT_AUDIT_REPORT.md',
  'BUG_FIXES_SUMMARY.md',
  'BUG_SCAN_REPORT.md',
  'COMPLETE_ENVIRONMENT_VARIABLES.md',
  'COMPLETE_FEATURE_SUMMARY.md',
  'FEATURES_SUMMARY.md',
  'FINAL-STATUS.md',
  'FUNCTION_SUMMARY.md',
  'INFRASTRUCTURE_SCAN_REPORT.md',
  'REFACTOR_COMPLETE_REPORT.md',
  'REFACTOR_FINAL_SUMMARY.md',
  'REFACTOR_PROGRESS.md',
  'REFACTOR_STATUS.md',
  'REFACTOR_SUMMARY.md',
  'SUCCESS_SUMMARY.md',
  'VERSION_SYSTEM_SUMMARY.md',
  
  // PR和迁移文档
  'PR-1_DESCRIPTION.md',
  'PR-2_DESCRIPTION.md',
  'PR-3_DESCRIPTION.md',
  'PR-3_SUMMARY.md',
  'PR-4_DESCRIPTION.md',
  'PR-7_SCHEMA_ALIGN.md',
  'MIGRATION_DELIVERABLES.md',
  'MIGRATION_EXECUTION_GUIDE.md',
  'MIGRATION_GUIDE.md',
  'MIGRATION_INSTRUCTIONS.md',
  
  // 中文文档
  'API路由Supabase集成检查.md',
  'SQL脚本修复说明.md',
  '修复注册和OAuth登录问题.md',
  '分支策略与PR计划.md',
  '分离蓝图.md',
  '商家员工页面使用说明.md',
  '商家登录配置说明.md',
  '安全修复完成报告.md',
  '数据库字段修复报告.md',
  '数据库结构诊断报告.md',
  '数据库连接问题诊断和修复.md',
  '注册问题RLS策略分析.md',
  '注册问题修复指南.md',
  '注册问题分析和解决方案.md',
  '活动购票功能修复报告.md',
  '测试完成报告.md',
  '环境变量矩阵.md',
  '生产环境配置指南.md',
  '部署安全修复计划.md',
  '部署安全诊断报告.md',
  '问题诊断报告.md',
  '项目架构检查报告.md',
  '项目检查报告.md',
  '风险评估与回滚方案.md',
  '交付物总结.md',
  'RLS_设置完成检查清单.md',
  'SUPABASE配置修复指南.md',
  
  // 其他临时文档
  'import-path-fix-report.md',
  'test-report.md',
  'translate-to-english.md',
  'PLAN.md',
];

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ 已删除: ${path.relative(rootDir, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 删除失败 ${filePath}:`, error.message);
    return false;
  }
}

function moveToArchive(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const destPath = path.join(docsArchiveDir, fileName);
      fs.renameSync(filePath, destPath);
      console.log(`📦 已归档: ${path.relative(rootDir, filePath)} -> docs/archive/${fileName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ 归档失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 开始清理代码库...\n');
  
  let deletedCount = 0;
  let archivedCount = 0;
  
  // 删除文件
  console.log('📝 删除未使用的文件...');
  filesToDelete.forEach(pattern => {
    // 处理通配符模式
    if (pattern.includes('*')) {
      const prefix = pattern.split('*')[0];
      const suffix = pattern.split('*')[1] || '';
      const files = fs.readdirSync(rootDir).filter(f => 
        f.startsWith(prefix) && f.endsWith(suffix) && fs.statSync(path.join(rootDir, f)).isFile()
      );
      files.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (deleteFile(filePath)) deletedCount++;
      });
    } else {
      const filePath = path.join(rootDir, pattern);
      if (deleteFile(filePath)) deletedCount++;
    }
  });
  
  // 归档文档
  console.log('\n📚 归档文档到 docs/archive/...');
  docsToArchive.forEach(doc => {
    const filePath = path.join(rootDir, doc);
    if (moveToArchive(filePath)) archivedCount++;
  });
  
  console.log(`\n✨ 清理完成！`);
  console.log(`   - 删除文件: ${deletedCount}`);
  console.log(`   - 归档文档: ${archivedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { deleteFile, moveToArchive };

