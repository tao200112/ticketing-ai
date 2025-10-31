require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('🔍 测试 .edu 邮箱注册...\n');

// 测试邮箱格式验证
const testEmails = [
  'student@university.edu',
  'user@harvard.edu',
  'test@mit.edu',
  'demo@stanford.edu'
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

console.log('📧 邮箱格式验证测试:');
testEmails.forEach(email => {
  const isValid = emailRegex.test(email);
  console.log(`${isValid ? '✅' : '❌'} ${email} - ${isValid ? '有效' : '无效'}`);
});

console.log('\n📤 测试发送邮件到 .edu 邮箱...');

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

async function testEduEmail() {
  const testEmail = 'student@university.edu';
  
  const mailOptions = {
    from: `"PartyTix Test" <${smtpConfig.auth.user}>`,
    to: testEmail,
    subject: 'Test .edu Email - PartyTix',
    text: `This is a test email sent to ${testEmail} at ${new Date().toISOString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test .edu Email - PartyTix</h2>
        <p>This is a test email sent to <strong>${testEmail}</strong></p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you receive this email, .edu emails are working correctly.</p>
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
      console.log('   🔑 认证失败，请检查 SMTP 配置');
    } else if (error.code === 'ECONNECTION') {
      console.log('   🌐 连接失败，请检查网络');
    } else if (error.responseCode === 550) {
      console.log('   📧 邮箱地址不存在或被拒绝');
    }
  }
}

// 运行测试
testEduEmail().catch(console.error);



