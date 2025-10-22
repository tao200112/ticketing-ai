// 测试 webhook 数据库集成
const crypto = require('crypto');

const webhookSecret = 'whsec_test_secret';

// 模拟 checkout.session.completed 事件
const payload = JSON.stringify({
  id: 'evt_test_webhook_db',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_session_db_' + Date.now(),
      object: 'checkout.session',
      amount_total: 1500,
      currency: 'usd',
      customer_email: 'test@example.com',
      payment_status: 'paid',
      metadata: {
        event_id: 'ridiculous-chicken',
        tier: 'basic',
        quantity: '1'
      }
    }
  },
  created: Math.floor(Date.now() / 1000)
});

// 生成签名
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload, 'utf8')
  .digest('hex');
const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log('Testing webhook with database integration...');
console.log('Session ID:', JSON.parse(payload).data.object.id);

// 发送测试请求
fetch('http://localhost:3000/api/stripe/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': stripeSignature
  },
  body: payload
})
.then(response => {
  console.log('Response Status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Response Body:', data);
  if (response.status === 200) {
    console.log('✅ Webhook processed successfully');
    console.log('Check the database for new order and tickets!');
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});
