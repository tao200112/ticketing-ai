/**
 * 邮件服务
 * 使用 Nodemailer 发送验证邮件和重置密码邮件
 */

import nodemailer from 'nodemailer';
import { createError } from './error-codes.js';

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  /**
   * 创建邮件传输器
   */
  createTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // 如果没有配置 SMTP，使用测试模式
    if (!config.auth.user || !config.auth.pass) {
      console.warn('⚠️ SMTP 未配置，使用测试模式');
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }

    return nodemailer.createTransport(config);
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(email, name, token) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"PartyTix" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '请验证您的邮箱 - PartyTix',
      html: this.getVerificationEmailTemplate(name, verificationUrl),
      text: this.getVerificationEmailText(name, verificationUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ 验证邮件已发送:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ 发送验证邮件失败:', error);
      throw createError('API_001', { 
        details: 'Failed to send verification email',
        originalError: error.message 
      });
    }
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email, name, token) {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"PartyTix" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '重置您的密码 - PartyTix',
      html: this.getPasswordResetEmailTemplate(name, resetUrl),
      text: this.getPasswordResetEmailText(name, resetUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ 密码重置邮件已发送:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ 发送密码重置邮件失败:', error);
      throw createError('API_001', { 
        details: 'Failed to send password reset email',
        originalError: error.message 
      });
    }
  }

  /**
   * 获取验证邮件 HTML 模板
   */
  getVerificationEmailTemplate(name, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>验证您的邮箱</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 欢迎加入 PartyTix！</h1>
          </div>
          <div class="content">
            <h2>你好，${name}！</h2>
            <p>感谢您注册 PartyTix！为了确保您的账户安全，请验证您的邮箱地址。</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">验证邮箱地址</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ 重要提示：</strong>
              <ul>
                <li>此链接将在 24 小时后过期</li>
                <li>未验证邮箱将无法购票、创建活动或提现</li>
                <li>如果按钮无法点击，请复制以下链接到浏览器：</li>
              </ul>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${verificationUrl}
              </p>
            </div>
            
            <p>如果您没有注册 PartyTix 账户，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由 PartyTix 系统自动发送，请勿回复。</p>
            <p>© 2024 PartyTix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 获取验证邮件纯文本模板
   */
  getVerificationEmailText(name, verificationUrl) {
    return `
欢迎加入 PartyTix！

你好，${name}！

感谢您注册 PartyTix！为了确保您的账户安全，请验证您的邮箱地址。

请点击以下链接验证您的邮箱：
${verificationUrl}

重要提示：
- 此链接将在 24 小时后过期
- 未验证邮箱将无法购票、创建活动或提现
- 如果您没有注册 PartyTix 账户，请忽略此邮件

此邮件由 PartyTix 系统自动发送，请勿回复。

© 2024 PartyTix. All rights reserved.
    `;
  }

  /**
   * 获取密码重置邮件 HTML 模板
   */
  getPasswordResetEmailTemplate(name, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>重置您的密码</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #FEF2F2; border: 1px solid #FCA5A5; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 重置您的密码</h1>
          </div>
          <div class="content">
            <h2>你好，${name}！</h2>
            <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码。</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">重置密码</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ 安全提示：</strong>
              <ul>
                <li>此链接将在 30 分钟后过期</li>
                <li>此链接只能使用一次</li>
                <li>如果您没有请求重置密码，请立即联系我们</li>
                <li>如果按钮无法点击，请复制以下链接到浏览器：</li>
              </ul>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetUrl}
              </p>
            </div>
            
            <p>如果您没有请求重置密码，请忽略此邮件。您的密码将保持不变。</p>
          </div>
          <div class="footer">
            <p>此邮件由 PartyTix 系统自动发送，请勿回复。</p>
            <p>© 2024 PartyTix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 获取密码重置邮件纯文本模板
   */
  getPasswordResetEmailText(name, resetUrl) {
    return `
重置您的密码 - PartyTix

你好，${name}！

我们收到了您的密码重置请求。请点击以下链接重置您的密码：
${resetUrl}

安全提示：
- 此链接将在 30 分钟后过期
- 此链接只能使用一次
- 如果您没有请求重置密码，请立即联系我们

如果您没有请求重置密码，请忽略此邮件。您的密码将保持不变。

此邮件由 PartyTix 系统自动发送，请勿回复。

© 2024 PartyTix. All rights reserved.
    `;
  }

  /**
   * 验证邮件配置
   */
  async verifyConfig() {
    try {
      await this.transporter.verify();
      console.log('✅ 邮件服务配置验证成功');
      return true;
    } catch (error) {
      console.error('❌ 邮件服务配置验证失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const emailService = new EmailService();

export default emailService;
