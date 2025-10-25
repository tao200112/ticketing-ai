import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createOrderFromStripeSession, getOrderByStripeSession, issueTicketsForOrder } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

// 强制使用 Node.js runtime
export const runtime = 'nodejs';

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request) {
  const logger = createLogger('stripe/webhook');
  const requestId = getRequestId(request);
  
  try {
    logger.start({
      requestId,
      http: {
        method: 'POST',
        url: '/api/stripe/webhook'
      }
    });
    
    // 获取原始请求体
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    logger.info('Webhook received', {
      requestId,
      hasBody: !!body,
      hasSignature: !!signature,
      bodyLength: body.length
    });
    
    // 验证 Stripe webhook 签名
    if (!signature) {
      logger.warn('Missing Stripe signature', { requestId });
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
      logger.error('Webhook signature verification failed', err, { requestId });
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
    
    logger.info('Webhook event received', {
      requestId,
      eventType: event.type,
      eventId: event.id,
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
        logger.info(`Unhandled event type: ${event.type}`, { requestId });
    }
    
    logger.success('Webhook processed successfully', {
      requestId,
      http: { status: 200 }
    });
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    logger.error('Webhook processing error', error, {
      requestId,
      needs_attention: true
    });
    
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
  const logger = createLogger('stripe/webhook/checkout-completed');
  const startTime = Date.now()
  
  logger.info('Processing checkout.session.completed', {
    sessionId: session.id,
    amountTotal: session.amount_total,
    paymentStatus: session.payment_status,
    currency: session.currency
  });
  
  try {
    // 1. 幂等检查：先查询是否已有订单和票据
    const existingOrder = await getOrderByStripeSession(session.id)
    
    if (existingOrder && existingOrder.tickets && existingOrder.tickets.length > 0) {
      logger.info('Order and tickets already exist, skipping creation', {
        orderId: existingOrder.id,
        ticketCount: existingOrder.tickets.length,
        duration_ms: Date.now() - startTime
      });
      return { ok: true, skipped: true }
    }

    // 2. 创建或获取订单
    let order
    if (existingOrder) {
      logger.info('Order exists but no tickets, creating tickets only');
      order = existingOrder
    } else {
      logger.info('Creating new order');
      order = await createOrderFromStripeSession(session)
    }

    // 3. 出票（幂等）
    const tickets = await issueTicketsForOrder(order, {
      quantity: 1, // 默认1张票，可根据业务逻辑调整
      userEmail: session.customer_email,
      eventId: order.eventId
    })

    logger.success('Successfully processed order and tickets', {
      orderId: order.id,
      ticketCount: tickets.length,
      ticketIds: tickets.map(t => t.shortId),
      duration_ms: Date.now() - startTime
    });

    return { ok: true, orderId: order.id, ticketCount: tickets.length }

  } catch (error) {
    logger.error('Error processing order', error, {
      sessionId: session.id,
      duration_ms: Date.now() - startTime,
      needs_attention: true
    });
    
    // 不抛出错误，避免 webhook 重试死循环
    // 但记录需要人工干预
    return { ok: false, error: error.message, needs_manual_attention: true }
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
