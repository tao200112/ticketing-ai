require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('🔍 测试真实邮箱地址...\n');

// SMTP 配置
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

// 使用真实邮箱地址测试
const realEmails = [
  'taoliu001711@gmail.com',  // 已知可用的 Gmail
  // 添加其他真实邮箱地址进行测试
];

async function testRealEmails() {
  for (const email of realEmails) {
    console.log(`📤 测试发送邮件到: ${email}`);
    
    const mailOptions = {
      from: `"PartyTix Test" <${smtpConfig.auth.user}>`,
      to: email,
      subject: 'Real Email Test - PartyTix',
      text: `This is a test email sent to ${email} at ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Real Email Test - PartyTix</h2>
          <p>This is a test email sent to <strong>${email}</strong></p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>If you receive this email, the SMTP configuration is working correctly.</p>
        </div>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ 邮件发送成功: ${email}`);
      console.log(`   Message ID: ${info.messageId}`);
    } catch (error) {
      console.log(`❌ 邮件发送失败: ${email}`);
      console.log(`   错误: ${error.message}`);
    }
    
    console.log(''); // 空行分隔
  }
}

// 运行测试
testRealEmails().catch(console.error);



