import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('checkout-sessions-api')

// 安全地初始化Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null

export async function POST(request) {
  try {
    // 检查Stripe是否已初始化
    if (!stripe) {
      throw ErrorHandler.configurationError(
        'STRIPE_NOT_CONFIGURED',
        '支付服务未配置'
      )
    }

    const body = await request.json()
    const { event_id, price_id, quantity = 1, customer_email, customer_name, userId } = body

    logger.info('Received checkout request', { 
      eventId: event_id, 
      priceId: price_id, 
      quantity 
    })

    if (!event_id || !price_id) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '缺少必需字段'
      )
    }
    
    // 验证数量
    const quantityNum = parseInt(quantity)
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 10) {
      throw ErrorHandler.validationError(
        'INVALID_QUANTITY',
        '数量必须在1-10之间'
      )
    }

    // 获取活动信息
    const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/events/${event_id}`)
    const eventResult = await eventResponse.json()

    if (!eventResult.success || !eventResult.data) {
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        '活动不存在'
      )
    }

    const event = eventResult.data
    const price = event.prices?.find(p => p.id === price_id)

    if (!price) {
      throw ErrorHandler.notFoundError(
        'PRICE_NOT_FOUND',
        '票种不存在'
      )
    }
    
    // 验证库存
    if (price.inventory !== null && price.inventory < quantityNum) {
      throw ErrorHandler.validationError(
        'INSUFFICIENT_INVENTORY',
        '库存不足'
      )
    }

    // 验证金额
    if (!price.amount_cents || price.amount_cents <= 0) {
      throw ErrorHandler.validationError(
        'INVALID_PRICE',
        '价格无效'
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
          quantity: quantityNum,
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
        quantity: quantityNum.toString(),
        customer_name: customer_name || '',
        user_id: userId || '',
      },
    })

    logger.success('Checkout session created', { sessionId: session.id })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
