import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { event_id, price_id, quantity = 1, customer_email, customer_name } = body

    console.log('📦 收到请求:', { event_id, price_id, quantity, customer_email, customer_name })

    if (!event_id || !price_id) {
      console.error('❌ 缺少必需字段:', { event_id, price_id })
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: '缺少必需字段'
        },
        { status: 400 }
      )
    }

    // 获取活动信息
    const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/events/${event_id}`)
    const eventResult = await eventResponse.json()

    if (!eventResult.success || !eventResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'EVENT_NOT_FOUND',
          message: '活动不存在'
        },
        { status: 404 }
      )
    }

    const event = eventResult.data
    const price = event.prices?.find(p => p.id === price_id)

    if (!price) {
      return NextResponse.json(
        {
          success: false,
          error: 'PRICE_NOT_FOUND',
          message: '票种不存在'
        },
        { status: 404 }
      )
    }

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title || event.name} - ${price.name}`,
              description: event.description || '',
            },
            unit_amount: price.amount_cents,
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events/${event_id}`,
      customer_email: customer_email,
      metadata: {
        event_id: event_id,
        price_id: price_id,
        price_name: price.name,
        quantity: quantity.toString(),
        customer_name: customer_name || '',
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('❌ 创建支付会话失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'PAYMENT_ERROR',
        message: error.message || '创建支付会话失败'
      },
      { status: 500 }
    )
  }
}
