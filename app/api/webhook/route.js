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
    console.error('❌ Stripe未配置')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  // 检查 webhook 密钥配置
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET 未配置')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('❌ Webhook 签名验证失败:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log('✅ 收到 Stripe 事件:', event.type)

  // 处理支付成功事件
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    try {
      // 连接 Supabase
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase 未配置')
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      console.log('📦 处理订单:', session.id, session.metadata)

      // 检查订单是否已存在
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single()

      if (existingOrder) {
        console.log('✅ 订单已存在，跳过创建')
        return NextResponse.json({ received: true })
      }

      // 获取客户年龄（从 metadata 或用户数据）
      let customerAge = null
      if (session.metadata?.customer_age) {
        const ageFromMetadata = parseInt(session.metadata.customer_age)
        if (!isNaN(ageFromMetadata) && ageFromMetadata > 0) {
          customerAge = ageFromMetadata
        }
      } else if (session.metadata?.user_id) {
        // 如果metadata中没有年龄，尝试从用户数据获取
        const { data: userData } = await supabase
          .from('users')
          .select('age')
          .eq('id', session.metadata.user_id)
          .single()
        
        if (userData?.age) {
          customerAge = userData.age
        }
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
          metadata: {
            payment_intent: session.payment_intent,
            event_id: session.metadata?.event_id,
            tier: session.metadata?.price_name || 'general',
            user_id: session.metadata?.user_id || null
          }
        })
        .select()
        .single()

      if (orderError) {
        console.error('❌ 创建订单失败:', orderError)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
      }

      console.log('✅ 订单创建成功:', order.id)

      // 创建票据
      const quantity = parseInt(session.metadata?.quantity || '1')
      const priceName = session.metadata?.price_name || 'general'
      
      // Check if this is a combo ticket
      const isCombo = isComboTicket(priceName)
      const comboKinds = isCombo ? getComboTicketKinds(priceName) : [getTicketKindFromPriceName(priceName) || null]
      
      const tickets = []

      // 获取或创建默认活动ID
      let eventId = session.metadata?.event_id
      
      // 如果event_id不是有效的UUID，使用默认活动
      if (!eventId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
        console.log('⚠️ 使用默认活动ID，因为event_id无效:', eventId)
        // 获取第一个活动作为默认
        const { data: defaultEvent, error: defaultEventError } = await supabase
          .from('events')
          .select('id')
          .limit(1)
          .single()
        
        if (defaultEventError || !defaultEvent) {
          console.warn('⚠️ 获取默认活动失败，使用回退ID:', defaultEventError)
        }
        
        eventId = defaultEvent?.id || '45091d37-7252-43c7-93c8-a7033d28af31'
      }
      
      // Get event to determine validity window
      let validityStartTime = null
      let validityEndTime = null
      
      if (eventId) {
        const { data: eventData, error: eventDataError } = await supabase
          .from('events')
          .select('start_at, end_at')
          .eq('id', eventId)
          .single()
        
        if (eventDataError) {
          console.warn('⚠️ 获取活动时间失败:', eventDataError)
        } else if (eventData) {
          // Set validity window based on event times
          validityStartTime = eventData.start_at
          validityEndTime = eventData.end_at
        }
      }

      // Get user information if available
      let holderName = session.customer_email
      let holderAge = null
      
      if (session.metadata?.user_id) {
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('name, age')
          .eq('id', session.metadata.user_id)
          .single()
        
        if (userDataError) {
          console.warn('⚠️ 获取用户信息失败:', userDataError)
        } else if (userData) {
          holderName = userData.name || session.metadata?.customer_name || session.customer_email
          holderAge = userData.age
        }
      } else if (session.metadata?.customer_name) {
        holderName = session.metadata.customer_name
      }

      // 获取年龄（优先从metadata，其次从用户数据）
      let ticketHolderAge = holderAge
      if (session.metadata?.customer_age) {
        const ageFromMetadata = parseInt(session.metadata.customer_age)
        if (!isNaN(ageFromMetadata) && ageFromMetadata > 0) {
          ticketHolderAge = ageFromMetadata
        }
      }

      // Create tickets: for combo tickets, create multiple tickets per quantity
      for (let i = 0; i < quantity; i++) {
        const ticketKinds = isCombo ? comboKinds : [comboKinds[0]]
        
        for (const ticketKind of ticketKinds) {
          const shortId = generateShortTicketId()
          
          const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            order_id: order.id,
            event_id: eventId,
            tier: session.metadata?.price_name || 'general',
            ticket_kind: ticketKind || null,
            holder_email: session.customer_email,
            holder_name: holderName,
            holder_age: ticketHolderAge,
            user_id: session.metadata?.user_id || null,
            status: 'unused',
            used: false,
            short_id: shortId,
            validity_start_time: validityStartTime,
            validity_end_time: validityEndTime
          })
          .select()
          .single()

          if (ticketError) {
            console.error('❌ 创建票据失败:', ticketError)
            return NextResponse.json({ 
              error: 'Failed to create ticket', 
              details: ticketError.message 
            }, { status: 500 })
          } else {
            console.log('✅ 票据创建成功:', ticket.id)
            tickets.push(ticket)
          }
        }
      }

      return NextResponse.json({ received: true, order, tickets })

    } catch (error) {
      console.error('❌ Webhook 处理错误:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
