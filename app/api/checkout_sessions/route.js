import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request) {
  try {
    console.log('[CheckoutSessions] API Request: POST /api/checkout_sessions');
    
    // 解析请求体
    const body = await request.json();
    const { priceId, quantity = 1, metadata = {} } = body;
    
    // 验证必需参数
    if (!priceId) {
      console.warn('[CheckoutSessions] Missing required parameter: priceId');
      return NextResponse.json(
        { error: 'Missing required parameter: priceId' },
        { status: 400 }
      );
    }
    
    // 验证 priceId 格式
    if (!priceId.startsWith('price_')) {
      console.warn('[CheckoutSessions] Invalid priceId format:', priceId);
      return NextResponse.json(
        { error: 'Invalid priceId format. Must start with "price_"' },
        { status: 400 }
      );
    }
    
    // 验证 quantity
    if (quantity < 1 || quantity > 10) {
      console.warn('[CheckoutSessions] Invalid quantity:', quantity);
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      );
    }
    
    console.log('[CheckoutSessions] Creating checkout session:', { priceId, quantity, metadata });
    
    // 构建 metadata
    const sessionMetadata = {
      source: 'ridiculous-chicken-event',
      ...metadata
    };
    
    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/events/ridiculous-chicken`,
      metadata: sessionMetadata,
      // 允许客户输入邮箱
      customer_creation: 'always',
    });
    
    console.log('[CheckoutSessions] Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });
    
    return NextResponse.json({
      url: session.url
    });
    
  } catch (error) {
    console.error('[CheckoutSessions] Error creating checkout session:', error);
    
    // 处理 Stripe 特定错误
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { 
          error: 'Invalid request to Stripe',
          message: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create checkout session'
      },
      { status: 500 }
    );
  }
}

// 处理其他 HTTP 方法
export async function GET() {
  console.warn('[CheckoutSessions] GET method not allowed on /api/checkout_sessions');
  
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
