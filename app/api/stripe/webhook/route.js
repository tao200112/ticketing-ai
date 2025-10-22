import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processPaidOrder } from '../../../lib/ticket-service.js';

// 强制使用 Node.js runtime
export const runtime = 'nodejs';

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request) {
  try {
    console.log('[StripeWebhook] API Request: POST /api/stripe/webhook');
    
    // 获取原始请求体
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.log('[StripeWebhook] Webhook received:', {
      hasBody: !!body,
      hasSignature: !!signature,
      bodyLength: body.length
    });
    
    // 验证 Stripe webhook 签名
    if (!signature) {
      console.warn('[StripeWebhook] Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }
    
    // 验证 webhook 签名
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[StripeWebhook] Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
    
    console.log('[StripeWebhook] Webhook event received:', {
      type: event.type,
      id: event.id,
      created: event.created
    });
    
    // 处理不同类型的 webhook 事件
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }
    
    console.log('[StripeWebhook] API Response: 200 - Webhook processed successfully');
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[StripeWebhook] Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// 处理 checkout session 完成事件
async function handleCheckoutSessionCompleted(session) {
  console.log('paid', session.id);
  
  console.log('[StripeWebhook] Processing checkout.session.completed:', {
    sessionId: session.id,
    customerEmail: session.customer_email,
    amountTotal: session.amount_total,
    paymentStatus: session.payment_status,
    currency: session.currency,
    metadata: session.metadata
  });
  
  try {
    // 处理支付完成的订单，创建订单和票务
    const result = await processPaidOrder(session);
    
    console.log('[StripeWebhook] Order processed successfully:', {
      orderId: result.order.id,
      ticketCount: result.tickets.length,
      ticketIds: result.tickets.map(t => t.shortId)
    });
    
    // 暂不发邮件，只记录日志
    console.log('[StripeWebhook] Tickets generated for customer:', session.customer_email);
    
  } catch (error) {
    console.error('[StripeWebhook] Error processing order:', error);
    // 不抛出错误，避免 webhook 重试
    console.log('[StripeWebhook] Order processing failed, but webhook will return 200');
  }
}

// 占位函数：处理支付成功事件
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('[StripeWebhook] Processing payment_intent.succeeded:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  });
  
  // 占位逻辑：实际应该更新订单状态，生成票务等
  console.log('[StripeWebhook] Payment succeeded - placeholder processing');
}

// 占位函数：处理支付失败事件
async function handlePaymentIntentFailed(paymentIntent) {
  console.warn('[StripeWebhook] Processing payment_intent.payment_failed:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    lastPaymentError: paymentIntent.last_payment_error
  });
  
  // 占位逻辑：实际应该处理支付失败，发送通知等
  console.log('[StripeWebhook] Payment failed - placeholder processing');
}

// 处理其他 HTTP 方法
export async function GET() {
  console.warn('[StripeWebhook] GET method not allowed on /api/stripe/webhook');
  
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
