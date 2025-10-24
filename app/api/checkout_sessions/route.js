import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// 验证 Stripe 配置
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[CheckoutSessions] STRIPE_SECRET_KEY is not defined');
}

export async function POST(request) {
  try {
    console.log('[CheckoutSessions] API Request: POST /api/checkout_sessions');
    
    // 检查 Stripe 配置
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[CheckoutSessions] STRIPE_SECRET_KEY is not defined');
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    const { 
      eventId, 
      ticketType, 
      quantity = 1, 
      customerEmail,
      customerName,
      metadata = {} 
    } = body;
    
    // 验证必需参数
    if (!eventId || !ticketType) {
      console.warn('[CheckoutSessions] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: eventId and ticketType' },
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
    
    // 从请求体中获取事件信息
    const { eventData } = body;
    
    if (!eventData) {
      console.warn('[CheckoutSessions] Event data not provided');
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }
    
    const event = eventData;
    
    // 查找票种信息
    const ticketInfo = event.prices.find(p => p.name === ticketType);
    if (!ticketInfo) {
      console.warn('[CheckoutSessions] Ticket type not found:', ticketType);
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }
    
    // 检查库存
    if (ticketInfo.inventory < quantity) {
      console.warn('[CheckoutSessions] Insufficient inventory');
      return NextResponse.json(
        { error: 'Insufficient inventory' },
        { status: 400 }
      );
    }
    
    console.log('[CheckoutSessions] Creating checkout session:', { 
      eventId, 
      ticketType, 
      quantity, 
      customerEmail,
      customerName 
    });
    
    // 构建 metadata
    const sessionMetadata = {
      eventId: eventId,
      eventTitle: event.title,
      ticketType: ticketType,
      quantity: quantity.toString(),
      customerEmail: customerEmail || '',
      customerName: customerName || '',
      ...metadata
    };
    
    // 验证价格数据
    if (!ticketInfo.amount_cents || ticketInfo.amount_cents <= 0) {
      console.warn('[CheckoutSessions] Invalid amount_cents:', ticketInfo.amount_cents);
      return NextResponse.json(
        { error: 'Invalid ticket price' },
        { status: 400 }
      );
    }

    // 验证 Stripe 最小金额要求（50 分 = $0.50）
    if (ticketInfo.amount_cents < 50) {
      console.warn('[CheckoutSessions] Amount too small for Stripe:', ticketInfo.amount_cents);
      return NextResponse.json(
        { error: 'Ticket price must be at least $0.50 (Stripe minimum requirement)' },
        { status: 400 }
      );
    }

    console.log('[CheckoutSessions] Creating session with:', {
      eventTitle: event.title,
      ticketType: ticketType,
      amountCents: ticketInfo.amount_cents,
      quantity: quantity,
      customerEmail: customerEmail
    });

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} - ${ticketType}`,
              description: event.description || 'Event ticket',
              metadata: {
                eventId: eventId,
                ticketType: ticketType
              }
            },
            unit_amount: ticketInfo.amount_cents, // 价格以分为单位
          },
          quantity: quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events/dynamic/${event.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()}`,
      metadata: sessionMetadata,
      customer_email: customerEmail,
      // 允许客户输入邮箱
      customer_creation: 'always',
    });
    
    console.log('[CheckoutSessions] Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });
    
    return NextResponse.json({
      url: session.url,
      sessionId: session.id
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
