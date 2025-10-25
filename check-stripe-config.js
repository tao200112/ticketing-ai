#!/usr/bin/env node

const checkStripeConfig = () => {
  console.log('🔍 检查Stripe配置\n');

  // 检查环境变量
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('📋 环境变量检查:');
  console.log(`STRIPE_SECRET_KEY: ${stripeSecretKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${stripePublishableKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`STRIPE_WEBHOOK_SECRET: ${stripeWebhookSecret ? '✅ 已配置' : '❌ 未配置'}`);

  if (stripeSecretKey) {
    console.log(`\n🔑 Stripe Secret Key 前缀: ${stripeSecretKey.substring(0, 10)}...`);
    console.log(`🔑 Stripe Secret Key 类型: ${stripeSecretKey.startsWith('sk_test_') ? '测试密钥' : stripeSecretKey.startsWith('sk_live_') ? '生产密钥' : '未知类型'}`);
  }

  if (stripePublishableKey) {
    console.log(`\n🔑 Stripe Publishable Key 前缀: ${stripePublishableKey.substring(0, 10)}...`);
    console.log(`🔑 Stripe Publishable Key 类型: ${stripePublishableKey.startsWith('pk_test_') ? '测试密钥' : stripePublishableKey.startsWith('pk_live_') ? '生产密钥' : '未知类型'}`);
  }

  // 检查是否是占位符
  const isPlaceholder = stripeSecretKey === 'your_stripe_secret_key_here' || 
                       stripePublishableKey === 'your_stripe_publishable_key_here' ||
                       stripeWebhookSecret === 'your_stripe_webhook_secret_here';

  if (isPlaceholder) {
    console.log('\n⚠️  检测到占位符值，需要配置真实的Stripe密钥');
  } else if (stripeSecretKey && stripePublishableKey) {
    console.log('\n✅ Stripe配置看起来是真实的');
  } else {
    console.log('\n❌ Stripe配置不完整');
  }

  console.log('\n📝 要配置Stripe，请在.env.local文件中设置:');
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...');
  console.log('STRIPE_SECRET_KEY=sk_test_...');
  console.log('STRIPE_WEBHOOK_SECRET=whsec_...');
};

checkStripeConfig();
