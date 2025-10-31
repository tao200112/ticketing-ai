const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 测试邮件发送到任意邮箱地址...\n');

// 从环境变量获取配置
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

console.log('📧 SMTP 配置:');
console.log(`Host: ${smtpConfig.host}`);
console.log(`Port: ${smtpConfig.port}`);
console.log(`User: ${smtpConfig.auth.user}`);
console.log(`Pass: ${smtpConfig.auth.pass ? '***已设置***' : '❌ 未设置'}\n`);

// 创建传输器
const transporter = nodemailer.createTransport(smtpConfig);

// 测试邮件配置
const testEmails = [
  'taoliu001711@gmail.com',
  'test@example.com',
  'user@test.com'
];

async function testEmailSending() {
  for (const testEmail of testEmails) {
    console.log(`📤 测试发送邮件到: ${testEmail}`);
    
    const mailOptions = {
      from: `"PartyTix Test" <${smtpConfig.auth.user}>`,
      to: testEmail,
      subject: 'Test Email - PartyTix',
      text: `This is a test email sent to ${testEmail} at ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email - PartyTix</h2>
          <p>This is a test email sent to <strong>${testEmail}</strong></p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>If you receive this email, the SMTP configuration is working correctly.</p>
        </div>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ 邮件发送成功: ${testEmail}`);
      console.log(`   Message ID: ${info.messageId}`);
    } catch (error) {
      console.log(`❌ 邮件发送失败: ${testEmail}`);
      console.log(`   错误: ${error.message}`);
      
      if (error.code === 'EAUTH') {
        console.log('   🔑 认证失败，请检查 SMTP 用户名和密码');
      } else if (error.code === 'ECONNECTION') {
        console.log('   🌐 连接失败，请检查 SMTP 主机和端口');
      } else if (error.responseCode === 550) {
        console.log('   📧 邮箱地址不存在或被拒绝');
      }
    }
    
    console.log(''); // 空行分隔
  }
}

// 运行测试
testEmailSending().catch(console.error);
