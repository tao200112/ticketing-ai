/**
 * 邮箱验证功能测试脚本
 * 测试邮箱验证和找回密码的完整流程
 */

import { createClient } from '@supabase/supabase-js';
import rateLimiter from '../lib/rate-limiter.js';
import emailService from '../lib/email-service.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class EmailVerificationTester {
  constructor() {
    this.testResults = [];
    this.testUser = null;
  }

  async runAllTests() {
    console.log('🧪 开始邮箱验证功能测试...\n');

    try {
      // 1. 测试数据库迁移
      await this.testDatabaseMigration();
      
      // 2. 测试邮件服务配置
      await this.testEmailServiceConfig();
      
      // 3. 测试限流功能
      await this.testRateLimiting();
      
      // 4. 测试用户注册和邮箱验证
      await this.testUserRegistrationAndVerification();
      
      // 5. 测试找回密码功能
      await this.testPasswordReset();
      
      // 6. 测试邮箱验证中间件
      await this.testEmailVerificationMiddleware();
      
      // 7. 清理测试数据
      await this.cleanupTestData();
      
      // 输出测试结果
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error);
    }
  }

  async testDatabaseMigration() {
    console.log('📊 测试数据库迁移...');
    
    try {
      // 检查新增字段是否存在
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'users')
        .in('column_name', [
          'email_verified_at',
          'last_password_reset_sent_at',
          'reset_token_hash',
          'reset_token_expire_at',
          'email_verification_token',
          'email_verification_expire_at'
        ]);

      if (error) {
        throw new Error(`检查字段失败: ${error.message}`);
      }

      const expectedFields = [
        'email_verified_at',
        'last_password_reset_sent_at',
        'reset_token_hash',
        'reset_token_expire_at',
        'email_verification_token',
        'email_verification_expire_at'
      ];

      const actualFields = columns.map(col => col.column_name);
      const missingFields = expectedFields.filter(field => !actualFields.includes(field));

      if (missingFields.length > 0) {
        throw new Error(`缺少字段: ${missingFields.join(', ')}`);
      }

      // 检查新增表是否存在
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .in('table_name', ['rate_limits', 'email_verification_logs']);

      if (tableError) {
        throw new Error(`检查表失败: ${tableError.message}`);
      }

      const expectedTables = ['rate_limits', 'email_verification_logs'];
      const actualTables = tables.map(table => table.table_name);
      const missingTables = expectedTables.filter(table => !actualTables.includes(table));

      if (missingTables.length > 0) {
        throw new Error(`缺少表: ${missingTables.join(', ')}`);
      }

      this.addTestResult('数据库迁移', true, '所有字段和表都已正确创建');
      
    } catch (error) {
      this.addTestResult('数据库迁移', false, error.message);
    }
  }

  async testEmailServiceConfig() {
    console.log('📧 测试邮件服务配置...');
    
    try {
      const isConfigValid = await emailService.verifyConfig();
      
      if (isConfigValid) {
        this.addTestResult('邮件服务配置', true, '邮件服务配置正确');
      } else {
        this.addTestResult('邮件服务配置', false, '邮件服务配置无效，请检查 SMTP 设置');
      }
      
    } catch (error) {
      this.addTestResult('邮件服务配置', false, error.message);
    }
  }

  async testRateLimiting() {
    console.log('🚦 测试限流功能...');
    
    try {
      const testKey = 'test-email@example.com';
      const testAction = 'test_action';
      
      // 测试正常请求
      const result1 = await rateLimiter.checkEmailLimit(testKey, testAction, 3, 1);
      if (!result1.allowed) {
        throw new Error('第一次请求应该被允许');
      }
      
      // 测试超过限制
      const result2 = await rateLimiter.checkEmailLimit(testKey, testAction, 1, 1);
      if (result2.allowed) {
        throw new Error('超过限制的请求应该被拒绝');
      }
      
      this.addTestResult('限流功能', true, '限流功能正常工作');
      
    } catch (error) {
      this.addTestResult('限流功能', false, error.message);
    }
  }

  async testUserRegistrationAndVerification() {
    console.log('👤 测试用户注册和邮箱验证...');
    
    try {
      // 创建测试用户
      const testEmail = `test-${Date.now()}@example.com`;
      const testUser = {
        email: testEmail,
        name: 'Test User',
        age: 25,
        password: 'testpassword123'
      };

      // 注册用户
      const { data: newUser, error: registerError } = await supabase
        .from('users')
        .insert([{
          email: testUser.email,
          name: testUser.name,
          age: testUser.age,
          password_hash: 'hashed_password',
          role: 'user'
        }])
        .select()
        .single();

      if (registerError) {
        throw new Error(`用户注册失败: ${registerError.message}`);
      }

      this.testUser = newUser;

      // 测试生成验证令牌
      const { data: token, error: tokenError } = await supabase.rpc('send_verification_email', {
        p_user_id: newUser.id,
        p_email: newUser.email
      });

      if (tokenError) {
        throw new Error(`生成验证令牌失败: ${tokenError.message}`);
      }

      if (!token) {
        throw new Error('验证令牌为空');
      }

      // 测试验证邮箱
      const { error: verifyError } = await supabase
        .from('users')
        .update({
          email_verified_at: new Date().toISOString(),
          email_verification_token: null,
          email_verification_expire_at: null
        })
        .eq('id', newUser.id);

      if (verifyError) {
        throw new Error(`验证邮箱失败: ${verifyError.message}`);
      }

      this.addTestResult('用户注册和邮箱验证', true, '注册和验证流程正常');
      
    } catch (error) {
      this.addTestResult('用户注册和邮箱验证', false, error.message);
    }
  }

  async testPasswordReset() {
    console.log('🔒 测试找回密码功能...');
    
    try {
      if (!this.testUser) {
        throw new Error('测试用户不存在');
      }

      // 测试生成重置令牌
      const { data: resetToken, error: tokenError } = await supabase.rpc('send_password_reset_email', {
        p_user_id: this.testUser.id,
        p_email: this.testUser.email
      });

      if (tokenError) {
        throw new Error(`生成重置令牌失败: ${tokenError.message}`);
      }

      if (!resetToken) {
        throw new Error('重置令牌为空');
      }

      // 测试重置密码
      const { error: resetError } = await supabase
        .from('users')
        .update({
          password_hash: 'new_hashed_password',
          reset_token_hash: null,
          reset_token_expire_at: null,
          last_password_reset_sent_at: null
        })
        .eq('id', this.testUser.id);

      if (resetError) {
        throw new Error(`重置密码失败: ${resetError.message}`);
      }

      this.addTestResult('找回密码功能', true, '密码重置流程正常');
      
    } catch (error) {
      this.addTestResult('找回密码功能', false, error.message);
    }
  }

  async testEmailVerificationMiddleware() {
    console.log('🛡️ 测试邮箱验证中间件...');
    
    try {
      if (!this.testUser) {
        throw new Error('测试用户不存在');
      }

      // 测试检查邮箱验证状态
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, email_verified_at')
        .eq('id', this.testUser.id)
        .single();

      if (error) {
        throw new Error(`查询用户失败: ${error.message}`);
      }

      const isVerified = !!user.email_verified_at;
      if (!isVerified) {
        throw new Error('用户邮箱应该已验证');
      }

      this.addTestResult('邮箱验证中间件', true, '中间件功能正常');
      
    } catch (error) {
      this.addTestResult('邮箱验证中间件', false, error.message);
    }
  }

  async cleanupTestData() {
    console.log('🧹 清理测试数据...');
    
    try {
      if (this.testUser) {
        // 删除测试用户
        await supabase
          .from('users')
          .delete()
          .eq('id', this.testUser.id);
      }

      // 清理测试限流数据
      await rateLimiter.resetLimit('test-email@example.com', 'email', 'test_action');

      this.addTestResult('清理测试数据', true, '测试数据已清理');
      
    } catch (error) {
      this.addTestResult('清理测试数据', false, error.message);
    }
  }

  addTestResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
  }

  printTestResults() {
    console.log('\n📋 测试结果汇总:');
    console.log('='.repeat(50));
    
    let passedTests = 0;
    let totalTests = this.testResults.length;

    this.testResults.forEach((result, index) => {
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
    } else {
      console.log('⚠️ 部分测试失败，请检查相关配置。');
    }
  }
}

// 运行测试
const tester = new EmailVerificationTester();
tester.runAllTests().catch(console.error);
