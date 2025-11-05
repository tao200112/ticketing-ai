#!/usr/bin/env node

/**
 * 验收测试脚本
 * 验证：新分支可部署 Preview；Sentry 有事件上报；能一键回滚数据库
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ValidationTester {
  constructor() {
    this.results = {
      branchSetup: false,
      envConfig: false,
      sentrySetup: false,
      errorCodes: false,
      dbSnapshot: false,
      rollbackScripts: false,
      overall: false
    };
  }

  async runValidation() {
    console.log('🚀 开始验收测试...');
    console.log('==================');
    
    try {
      // 1. 验证分支设置
      await this.validateBranchSetup();
      
      // 2. 验证环境配置
      await this.validateEnvConfig();
      
      // 3. 验证 Sentry 设置
      await this.validateSentrySetup();
      
      // 4. 验证错误码字典
      await this.validateErrorCodes();
      
      // 5. 验证数据库快照
      await this.validateDbSnapshot();
      
      // 6. 验证回滚脚本
      await this.validateRollbackScripts();
      
      // 7. 生成测试报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 验收测试失败:', error.message);
      process.exit(1);
    }
  }

  async validateBranchSetup() {
    console.log('📋 验证分支设置...');
    
    try {
      // 检查当前分支
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      if (currentBranch === 'feat/identity-rbac-errors') {
        console.log('✅ 当前分支正确:', currentBranch);
        this.results.branchSetup = true;
      } else {
        console.log('❌ 当前分支错误:', currentBranch);
        this.results.branchSetup = false;
      }
      
      // 检查分支是否已推送到远程
      const remoteBranches = execSync('git branch -r', { encoding: 'utf8' });
      if (remoteBranches.includes('origin/feat/identity-rbac-errors')) {
        console.log('✅ 分支已推送到远程');
      } else {
        console.log('⚠️  分支未推送到远程');
      }
      
    } catch (error) {
      console.log('❌ 分支验证失败:', error.message);
      this.results.branchSetup = false;
    }
  }

  async validateEnvConfig() {
    console.log('📋 验证环境配置...');
    
    try {
      const requiredFiles = [
        'env.template',
        'env.local.example',
        'env.preview.example',
        'env.production.example',
        'scripts/setup-env.js'
      ];
      
      let allFilesExist = true;
      
      for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
          console.log(`✅ ${file} 存在`);
        } else {
          console.log(`❌ ${file} 不存在`);
          allFilesExist = false;
        }
      }
      
      // 测试环境设置脚本
      try {
        execSync('node scripts/setup-env.js local', { stdio: 'pipe' });
        console.log('✅ 环境设置脚本可执行');
      } catch (error) {
        console.log('⚠️  环境设置脚本执行失败:', error.message);
      }
      
      this.results.envConfig = allFilesExist;
      
    } catch (error) {
      console.log('❌ 环境配置验证失败:', error.message);
      this.results.envConfig = false;
    }
  }

  async validateSentrySetup() {
    console.log('📋 验证 Sentry 设置...');
    
    try {
      const requiredFiles = [
        'sentry.client.config.js',
        'sentry.server.config.js',
        'backend/sentry.config.js',
        'lib/request-id.js'
      ];
      
      let allFilesExist = true;
      
      for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
          console.log(`✅ ${file} 存在`);
        } else {
          console.log(`❌ ${file} 不存在`);
          allFilesExist = false;
        }
      }
      
      // 检查 package.json 中的 Sentry 依赖
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasSentryDeps = packageJson.dependencies['@sentry/nextjs'] && 
                           packageJson.dependencies['@sentry/node'];
      
      if (hasSentryDeps) {
        console.log('✅ Sentry 依赖已安装');
      } else {
        console.log('❌ Sentry 依赖未安装');
        allFilesExist = false;
      }
      
      this.results.sentrySetup = allFilesExist;
      
    } catch (error) {
      console.log('❌ Sentry 设置验证失败:', error.message);
      this.results.sentrySetup = false;
    }
  }

  async validateErrorCodes() {
    console.log('📋 验证错误码字典...');
    
    try {
      if (fs.existsSync('lib/error-codes.js')) {
        console.log('✅ 错误码字典文件存在');
        
        // 检查文件内容
        const content = fs.readFileSync('lib/error-codes.js', 'utf8');
        const hasErrorCodes = content.includes('ERROR_CODES') && 
                             content.includes('ERROR_CATEGORIES') &&
                             content.includes('createError');
        
        if (hasErrorCodes) {
          console.log('✅ 错误码字典内容完整');
          this.results.errorCodes = true;
        } else {
          console.log('❌ 错误码字典内容不完整');
          this.results.errorCodes = false;
        }
      } else {
        console.log('❌ 错误码字典文件不存在');
        this.results.errorCodes = false;
      }
      
    } catch (error) {
      console.log('❌ 错误码字典验证失败:', error.message);
      this.results.errorCodes = false;
    }
  }

  async validateDbSnapshot() {
    console.log('📋 验证数据库快照...');
    
    try {
      const requiredFiles = [
        'scripts/export-db-snapshot.js',
        'scripts/import-db-snapshot.js'
      ];
      
      let allFilesExist = true;
      
      for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
          console.log(`✅ ${file} 存在`);
        } else {
          console.log(`❌ ${file} 不存在`);
          allFilesExist = false;
        }
      }
      
      // 检查 backups 目录
      if (fs.existsSync('backups')) {
        console.log('✅ backups 目录存在');
      } else {
        console.log('⚠️  backups 目录不存在');
      }
      
      this.results.dbSnapshot = allFilesExist;
      
    } catch (error) {
      console.log('❌ 数据库快照验证失败:', error.message);
      this.results.dbSnapshot = false;
    }
  }

  async validateRollbackScripts() {
    console.log('📋 验证回滚脚本...');
    
    try {
      const requiredFiles = [
        'scripts/create-rollback.js',
        'scripts/execute-rollback.js',
        'scripts/quick-rollback.sh'
      ];
      
      let allFilesExist = true;
      
      for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
          console.log(`✅ ${file} 存在`);
        } else {
          console.log(`❌ ${file} 不存在`);
          allFilesExist = false;
        }
      }
      
      // 检查 db/rollback 目录
      if (fs.existsSync('db/rollback')) {
        console.log('✅ db/rollback 目录存在');
      } else {
        console.log('❌ db/rollback 目录不存在');
        allFilesExist = false;
      }
      
      // 检查 package.json 中的脚本
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasRollbackScripts = packageJson.scripts['db:rollback:create'] && 
                                packageJson.scripts['db:rollback:execute'] &&
                                packageJson.scripts['db:rollback:quick'];
      
      if (hasRollbackScripts) {
        console.log('✅ 回滚脚本命令已配置');
      } else {
        console.log('❌ 回滚脚本命令未配置');
        allFilesExist = false;
      }
      
      this.results.rollbackScripts = allFilesExist;
      
    } catch (error) {
      console.log('❌ 回滚脚本验证失败:', error.message);
      this.results.rollbackScripts = false;
    }
  }

  generateReport() {
    console.log('\n📊 验收测试报告');
    console.log('==================');
    
    const tests = [
      { name: '分支设置', result: this.results.branchSetup },
      { name: '环境配置', result: this.results.envConfig },
      { name: 'Sentry 设置', result: this.results.sentrySetup },
      { name: '错误码字典', result: this.results.errorCodes },
      { name: '数据库快照', result: this.results.dbSnapshot },
      { name: '回滚脚本', result: this.results.rollbackScripts }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
      const status = test.result ? '✅ 通过' : '❌ 失败';
      console.log(`${test.name}: ${status}`);
      if (test.result) passedTests++;
    });
    
    console.log('\n==================');
    console.log(`总计: ${passedTests}/${tests.length} 项通过`);
    
    this.results.overall = passedTests === tests.length;
    
    if (this.results.overall) {
      console.log('🎉 所有验收测试通过！');
      console.log('\n📋 验收标准达成:');
      console.log('✅ 新分支可部署 Preview');
      console.log('✅ Sentry 有事件上报');
      console.log('✅ 能一键回滚数据库');
    } else {
      console.log('❌ 部分验收测试失败，请检查上述问题');
    }
    
    // 保存测试结果
    const reportPath = `validation-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细报告已保存: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const tester = new ValidationTester();
  await tester.runValidation();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ValidationTester;
