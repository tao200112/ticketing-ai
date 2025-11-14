import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getServerUser } from '@/lib/auth-server'

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
        'Payment service not configured'
      )
    }

    // 获取当前登录用户的 Supabase Auth UID
    const authUser = await getServerUser()
    const supabaseUid = authUser?.id || null

    const body = await request.json()
    const { event_id, price_id, quantity = 1, customer_email, customer_name, customer_age, customerAge, userId } = body
    // 支持两种字段名：customer_age 或 customerAge
    const age = customer_age || customerAge
    
    // 优先使用 Supabase Auth UID，如果没有则使用传入的 userId（兼容旧代码）
    const finalUserId = supabaseUid || userId

    logger.info('Received checkout request', { 
      eventId: event_id, 
      priceId: price_id, 
      quantity 
    })

    if (!event_id || !price_id) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Missing required fields'
      )
    }
    
    // 验证数量
    const quantityNum = parseInt(quantity)
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 10) {
      throw ErrorHandler.validationError(
        'INVALID_QUANTITY',
        'Quantity must be between 1 and 10'
      )
    }

    // 获取活动信息
    const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/events/${event_id}`)
    const eventResult = await eventResponse.json()

    if (!eventResult.success || !eventResult.data) {
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found'
      )
    }

    const event = eventResult.data
    const price = event.prices?.find(p => p.id === price_id)

    if (!price) {
      throw ErrorHandler.notFoundError(
        'PRICE_NOT_FOUND',
        'Ticket type not found'
      )
    }
    
    // 验证库存（只在有库存限制时检查，null表示无限）
    if (price.inventory !== null && price.inventory !== undefined && price.inventory < quantityNum) {
      throw ErrorHandler.validationError(
        'INSUFFICIENT_INVENTORY',
        'Insufficient inventory'
      )
    }

    // 验证金额
    if (!price.amount_cents || price.amount_cents <= 0) {
      throw ErrorHandler.validationError(
        'INVALID_PRICE',
        'Invalid price'
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
        customer_age: age ? age.toString() : '',
        user_id: finalUserId || '', // 兼容旧代码
        supabase_uid: supabaseUid || '', // 新增：Supabase Auth UID
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
