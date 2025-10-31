/**
 * 邮件发送测试脚本
 * 测试邮件服务是否正常工作
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log('📧 测试邮件发送功能...\n');

async function testEmailSending() {
  try {
    // 导入邮件服务
    const emailService = (await import('../lib/email-service.js')).default;
    
    // 测试邮件配置
    console.log('🔧 检查邮件配置...');
    const isConfigValid = await emailService.verifyConfig();
    
    if (!isConfigValid) {
      console.error('❌ 邮件服务配置无效');
      console.log('请检查以下配置：');
      console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
      console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
      console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
      console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '已配置' : '未配置'}`);
      return;
    }
    
    console.log('✅ 邮件服务配置正确');
    
    // 测试发送验证邮件
    console.log('\n📤 测试发送验证邮件...');
    const testEmail = process.env.SMTP_USER; // 发送给自己
    const testName = 'Test User';
    const testToken = 'test-token-123456';
    
    try {
      const result = await emailService.sendVerificationEmail(
        testEmail,
        testName,
        testToken
      );
      
      if (result.success) {
        console.log('✅ 验证邮件发送成功');
        console.log(`📧 邮件ID: ${result.messageId}`);
        console.log(`📬 请检查邮箱: ${testEmail}`);
      } else {
        console.error('❌ 验证邮件发送失败');
      }
    } catch (error) {
      console.error('❌ 发送验证邮件时出错:', error.message);
    }
    
    // 测试发送重置密码邮件
    console.log('\n📤 测试发送重置密码邮件...');
    try {
      const result = await emailService.sendPasswordResetEmail(
        testEmail,
        testName,
        testToken
      );
      
      if (result.success) {
        console.log('✅ 重置密码邮件发送成功');
        console.log(`📧 邮件ID: ${result.messageId}`);
      } else {
        console.error('❌ 重置密码邮件发送失败');
      }
    } catch (error) {
      console.error('❌ 发送重置密码邮件时出错:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testEmailSending();
