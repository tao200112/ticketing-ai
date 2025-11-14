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

    // 先解析请求体（可能需要从 body 中获取用户信息作为回退）
    const body = await request.json()
    const { event_id, price_id, quantity = 1, customer_email, customer_name, customer_age, customerAge, userId } = body

    // 获取当前登录用户的 Supabase Auth UID（优先从 cookies/session）
    let authUser = await getServerUser()
    let supabaseUid = authUser?.id || null
    let userEmail = authUser?.email || null

    // 如果从 session 获取不到，尝试从请求 body 中获取（回退机制）
    // 注意：这需要前端确保传递正确的 userId（Supabase Auth UID）
    if (!supabaseUid && userId) {
      console.warn('[CheckoutSessions] Could not get user from session, trying from request body')
      console.warn('[CheckoutSessions] userId from body:', userId)
      // 验证 userId 是否是有效的 UUID 格式（Supabase Auth UID）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(userId)) {
        supabaseUid = userId
        console.log('[CheckoutSessions] Using supabase_uid from request body:', supabaseUid)
      } else {
        console.warn('[CheckoutSessions] userId from body is not a valid UUID format')
      }
    }

    // 调试日志
    console.log('[CheckoutSessions] supabase_uid =', supabaseUid)
    console.log('[CheckoutSessions] user email =', userEmail)
    console.log('[CheckoutSessions] hasAuth =', !!authUser)
    console.log('[CheckoutSessions] userId from body =', userId)
    logger.info('Checkout request - Auth info', { 
      supabaseUid,
      userEmail,
      hasAuth: !!authUser,
      userIdFromBody: userId
    })

    // 如果用户未登录，拒绝创建 checkout session
    if (!supabaseUid) {
      console.error('[CheckoutSessions] CRITICAL: User not authenticated!')
      console.error('[CheckoutSessions] No supabase_uid from session or request body')
      throw ErrorHandler.unauthorizedError(
        'AUTHENTICATION_REQUIRED',
        'User must be logged in to create checkout session. Please refresh the page and try again.'
      )
    }
    // 支持两种字段名：customer_age 或 customerAge
    const age = customer_age || customerAge
    
    // 使用 Supabase Auth UID（必须）
    const finalUserId = supabaseUid

    logger.info('Received checkout request', { 
      eventId: event_id, 
      priceId: price_id, 
      quantity,
      supabaseUid
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
      customer_email: customer_email || userEmail,
      metadata: {
        event_id: event_id,
        price_id: price_id,
        price_name: price.name,
        quantity: quantityNum.toString(),
        customer_name: customer_name || '',
        customer_age: age ? age.toString() : '',
        user_id: finalUserId || '', // 兼容旧代码
        supabase_uid: supabaseUid, // 必须：Supabase Auth UID（不能为空字符串）
        customer_email: customer_email || userEmail || '', // 确保 metadata 中有邮箱
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
