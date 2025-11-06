require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('🔍 测试 ltao19@vt.edu 邮箱...\n');

// 测试邮箱格式验证
const testEmail = 'ltao19@vt.edu';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

console.log('📧 邮箱格式验证:');
const isValid = emailRegex.test(testEmail);
console.log(`${isValid ? '✅' : '❌'} ${testEmail} - ${isValid ? '有效' : '无效'}`);

console.log('\n📤 测试发送邮件到 ltao19@vt.edu...');

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

async function testVtEmail() {
  const mailOptions = {
    from: `"PartyTix Test" <${smtpConfig.auth.user}>`,
    to: testEmail,
    subject: 'Test Email - PartyTix (VT.edu)',
    text: `This is a test email sent to ${testEmail} at ${new Date().toISOString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email - PartyTix (VT.edu)</h2>
        <p>This is a test email sent to <strong>${testEmail}</strong></p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you receive this email, VT.edu emails are working correctly.</p>
        <p>Please check your inbox and spam folder.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 邮件发送成功: ${testEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
  } catch (error) {
    console.log(`❌ 邮件发送失败: ${testEmail}`);
    console.log(`   错误代码: ${error.code}`);
    console.log(`   错误信息: ${error.message}`);
    console.log(`   响应代码: ${error.responseCode}`);
    console.log(`   响应信息: ${error.response}`);
    
    if (error.code === 'EAUTH') {
      console.log('   🔑 认证失败，请检查 SMTP 配置');
    } else if (error.code === 'ECONNECTION') {
      console.log('   🌐 连接失败，请检查网络');
    } else if (error.responseCode === 550) {
      console.log('   📧 邮箱地址不存在或被拒绝');
    } else if (error.responseCode === 554) {
      console.log('   🚫 邮件被拒绝，可能是垃圾邮件过滤');
    }
  }
}

// 运行测试
testVtEmail().catch(console.error);




