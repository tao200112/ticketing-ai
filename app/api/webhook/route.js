import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { generateShortTicketId } from '@/lib/ticket-utils'
import { isComboTicket, getComboTicketKinds, getTicketKindFromPriceName } from '@/lib/ticket-helpers'

// 安全地初始化Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request) {
  // 检查Stripe是否已初始化
  if (!stripe) {
    console.error('[Webhook] Stripe not configured')
    return NextResponse.json({ 
      success: false,
      error: 'CONFIGURATION_ERROR',
      message: 'Stripe not configured' 
    }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  // 检查 webhook 密钥配置
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ 
      success: false,
      error: 'CONFIGURATION_ERROR',
      message: 'Webhook secret not configured' 
    }, { status: 500 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ 
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Webhook signature verification failed' 
    }, { status: 400 })
  }

  // 处理支付成功事件
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    try {
      // 连接 Supabase
      if (!supabaseUrl || !supabaseKey) {
        console.error('[Webhook] Supabase not configured')
        return NextResponse.json({ 
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Supabase not configured' 
        }, { status: 500 })
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      // 检查订单是否已存在
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single()

      if (existingOrder) {
        return NextResponse.json({ 
        success: true,
        data: { received: true }
      })
      }

      // 获取统一身份标识（从 metadata 获取）
      // 支持新字段名 auth_user_id 和旧字段名 supabase_uid（向后兼容）
      let authUserId = session.metadata?.auth_user_id || session.metadata?.supabase_uid || null
      
      // 处理空字符串（Stripe metadata 不支持 null，会转换为空字符串）
      if (authUserId === '' || authUserId === 'null' || authUserId === 'undefined') {
        authUserId = null
      }
      
      // 验证 UUID 格式
      if (authUserId) {
        const { isValidAuthIdentity } = await import('@/lib/auth-identity')
        if (!isValidAuthIdentity(authUserId)) {
          console.warn('[Webhook] auth_user_id in metadata is not a valid UUID:', authUserId)
          authUserId = null
        }
      }
      
      // 如果 metadata 中没有身份标识，尝试通过邮箱查找
      if (!authUserId && session.customer_email) {
        console.warn('[Webhook] Missing auth_user_id in metadata, attempting to find by email')
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const matchingUser = authUsers?.users?.find(u => u.email === session.customer_email)
          if (matchingUser) {
            authUserId = matchingUser.id
          } else {
            console.error('[Webhook] Could not find user by email:', session.customer_email)
          }
        } catch (error) {
          console.error('[Webhook] Error finding user by email:', error)
        }
      }

      // 获取客户年龄（从 metadata 或用户数据）
      let customerAge = null
      if (session.metadata?.customer_age) {
        const ageFromMetadata = parseInt(session.metadata.customer_age)
        if (!isNaN(ageFromMetadata) && ageFromMetadata > 0) {
          customerAge = ageFromMetadata
        }
      }

      // 验证身份标识不为 null 再创建订单
      if (!authUserId) {
        console.error('[Webhook] CRITICAL: Cannot create order without auth_user_id!')
        console.error('[Webhook] Session metadata:', JSON.stringify(session.metadata, null, 2))
        console.error('[Webhook] Customer email:', session.customer_email)
        return NextResponse.json({ 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Missing auth_user_id in checkout session metadata',
          details: 'The checkout session does not contain auth_user_id. Please ensure user is logged in when creating checkout session.'
        }, { status: 500 })
      }

      // 创建订单
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          stripe_session_id: session.id,
          customer_email: session.customer_email,
          customer_name: session.metadata?.customer_name || session.customer_email,
          customer_age: customerAge,
          total_amount_cents: session.amount_total,
          currency: session.currency.toUpperCase(),
          status: 'paid',
          supabase_uid: authUserId, // Unified identity: Supabase Auth UID
          metadata: {
            payment_intent: session.payment_intent,
            event_id: session.metadata?.event_id,
            tier: session.metadata?.price_name || 'general',
            auth_user_id: authUserId // Unified identity in metadata
          }
        })
        .select()
        .single()

      if (orderError) {
        console.error('[Webhook] Failed to create order:', orderError)
        console.error('[Webhook] Order data attempted:', {
          stripe_session_id: session.id,
          supabase_uid: authUserId,
          customer_email: session.customer_email
        })
        return NextResponse.json({ 
          success: false, 
          error: 'DATABASE_ERROR',
          message: 'Failed to create order' 
        }, { status: 500 })
      }

      // 验证创建的订单确实有 supabase_uid
      if (!order.supabase_uid) {
        console.error('[Webhook] CRITICAL: Created order has null supabase_uid!', order.id)
      }

      // 创建票据
      const quantity = parseInt(session.metadata?.quantity || '1')
      const priceId = session.metadata?.price_id
      const priceName = session.metadata?.price_name || 'general'
      
      // Get ticket_kind from price if available, otherwise determine from price name
      let ticketKindFromPrice = null
      if (priceId) {
        const { data: priceData, error: priceError } = await supabase
          .from('prices')
          .select('ticket_kind')
          .eq('id', priceId)
          .single()
        
        if (!priceError && priceData?.ticket_kind) {
          ticketKindFromPrice = priceData.ticket_kind
        }
      }
      
      // Check if this is a combo ticket (check both ticket_kind and price name)
      const isCombo = isComboTicket(priceName, ticketKindFromPrice)
      
      // For combo tickets, get both ENTRY_COMBO and DRINK_COMBO
      // For non-combo tickets, get the single ticket kind
      let ticketKindsToCreate = []
      if (isCombo) {
        // Combo tickets MUST create two separate tickets
        ticketKindsToCreate = getComboTicketKinds(priceName, ticketKindFromPrice)
        
        // Safety check: ensure we have exactly 2 tickets for combo
        if (ticketKindsToCreate.length !== 2) {
          console.error('[Webhook] ERROR: Combo ticket should create 2 tickets, but got', ticketKindsToCreate.length)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
        
        // Verify both ticket kinds are present
        if (!ticketKindsToCreate.includes('ENTRY_COMBO') || !ticketKindsToCreate.includes('DRINK_COMBO')) {
          console.error('[Webhook] ERROR: Combo ticket missing required kinds. Got:', ticketKindsToCreate)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
      } else {
        // Single ticket - determine kind from price or metadata
        const singleKind = ticketKindFromPrice || getTicketKindFromPriceName(priceName) || null
        if (singleKind) {
          ticketKindsToCreate = [singleKind]
        } else {
          console.warn('[Webhook] Could not determine ticket_kind, defaulting to ENTRY_21_PLUS')
          ticketKindsToCreate = ['ENTRY_21_PLUS']
        }
      }
      
      const tickets = []

      // 获取或创建默认活动ID
      let eventId = session.metadata?.event_id
      
      // 如果event_id不是有效的UUID，使用默认活动
      if (!eventId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
        console.warn('[Webhook] Invalid event_id, using default event')
        // 获取第一个活动作为默认
        const { data: defaultEvent, error: defaultEventError } = await supabase
          .from('events')
          .select('id')
          .limit(1)
          .single()
        
        if (defaultEventError || !defaultEvent) {
          console.warn('[Webhook] Failed to get default event:', defaultEventError)
        }
        
        eventId = defaultEvent?.id || '45091d37-7252-43c7-93c8-a7033d28af31'
      }
      
      // Get event data to save snapshot and determine validity window
      let eventSnapshot = null
      let validityStartTime = null
      let validityEndTime = null
      
      if (eventId) {
        const { data: eventData, error: eventDataError } = await supabase
          .from('events')
          .select('title, description, venue_name, address, start_at, end_at, poster_url')
          .eq('id', eventId)
          .single()
        
        if (eventDataError) {
          console.warn('[Webhook] Failed to get event data:', eventDataError)
        } else if (eventData) {
          // Save event snapshot
          eventSnapshot = {
            title: eventData.title,
            description: eventData.description,
            venue_name: eventData.venue_name,
            address: eventData.address,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            poster_url: eventData.poster_url
          }
          // Set validity window based on event times
          validityStartTime = eventData.start_at
          validityEndTime = eventData.end_at
        }
      }
      
      // Get price snapshot
      let priceSnapshot = null
      if (priceId) {
        const { data: priceData, error: priceError } = await supabase
          .from('prices')
          .select('name, amount_cents, currency')
          .eq('id', priceId)
          .single()
        
        if (!priceError && priceData) {
          priceSnapshot = {
            name: priceData.name,
            amount_cents: priceData.amount_cents,
            currency: priceData.currency || 'USD'
          }
        }
      }

      // Get user information from metadata
      let holderName = session.metadata?.customer_name || session.customer_email
      let holderAge = null

      // 获取年龄（优先从metadata，其次从用户数据）
      let ticketHolderAge = holderAge
      if (session.metadata?.customer_age) {
        const ageFromMetadata = parseInt(session.metadata.customer_age)
        if (!isNaN(ageFromMetadata) && ageFromMetadata > 0) {
          ticketHolderAge = ageFromMetadata
        }
      }

      // Create tickets: for combo tickets, create multiple tickets per quantity
      // Each quantity unit creates all ticket kinds (e.g., 1 combo = 2 tickets, 2 combos = 4 tickets)
      for (let i = 0; i < quantity; i++) {
        for (const ticketKind of ticketKindsToCreate) {
          const shortId = generateShortTicketId()
          
          // 验证身份标识不为 null
          if (!authUserId) {
            console.error('[Webhook] CRITICAL: auth_user_id is null when creating ticket!')
            console.error('[Webhook] Session metadata:', JSON.stringify(session.metadata, null, 2))
            console.error('[Webhook] Customer email:', session.customer_email)
            // 不创建票，但继续处理其他票（如果有）
            continue
          }
          
          // 准备票务数据
          const ticketData = {
            order_id: order.id,
            event_id: eventId,
            tier: session.metadata?.price_name || 'general',
            ticket_kind: ticketKind || null,
            holder_email: session.customer_email,
            holder_name: holderName,
            holder_age: ticketHolderAge,
            supabase_uid: authUserId, // Database field name (stores Supabase Auth UID)
            status: 'unused',
            used: false,
            short_id: shortId,
            validity_start_time: validityStartTime,
            validity_end_time: validityEndTime,
            // Event snapshot (JSONB)
            event_snapshot: eventSnapshot || null,
            // Price snapshot (JSONB)
            price_snapshot: priceSnapshot || null
          }
          
          const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert(ticketData)
          .select()
          .single()

          if (ticketError) {
            console.error('[Webhook] Failed to create ticket:', ticketError)
            console.error('[Webhook] Ticket data attempted:', {
              order_id: ticketData.order_id,
              supabase_uid: ticketData.supabase_uid,
              holder_email: ticketData.holder_email,
              error_code: ticketError.code,
              error_message: ticketError.message
            })
            return NextResponse.json({ 
              success: false,
              error: 'DATABASE_ERROR',
              message: 'Failed to create ticket',
              details: ticketError.message 
            }, { status: 500 })
          } else {
            // 验证创建的票确实有 supabase_uid
            if (!ticket.supabase_uid) {
              console.error('[Webhook] CRITICAL: Created ticket has null supabase_uid!', {
                ticket_id: ticket.id,
                short_id: ticket.short_id,
                order_id: order.id
              })
            }
            tickets.push(ticket)
          }
        }
      }

      return NextResponse.json({ 
        success: true,
        data: { received: true, order, tickets }
      })

    } catch (error) {
      console.error('❌ Webhook 处理错误:', error)
      return NextResponse.json({ 
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message 
      }, { status: 500 })
    }
  }

  return NextResponse.json({ 
    success: true,
    data: { received: true }
  })
}
