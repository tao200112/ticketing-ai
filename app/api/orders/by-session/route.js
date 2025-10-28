import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// 安全地初始化Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null

function generateShortTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET(request) {
  try {
    // 检查Stripe是否已初始化
    if (!stripe) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Stripe not configured' 
      }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Supabase not configured' 
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 获取 session_id
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Missing session_id parameter' 
      }, { status: 400 })
    }

    console.log('🔍 查找订单:', sessionId)

    // 获取订单信息
    let { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single()

    // 如果订单不存在，尝试从 Stripe 创建
    if (orderError || !order) {
      console.error('❌ 订单未找到，尝试从 Stripe 获取并创建:', orderError)
      
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        
        if (session.payment_status !== 'paid') {
          return NextResponse.json({ 
            ok: false, 
            message: 'Payment not completed' 
          }, { status: 400 })
        }
        
        console.log('✅ 从 Stripe 获取 session:', session.id)
        
        // 创建订单
        const orderData = {
          stripe_session_id: session.id,
          customer_email: session.customer_email,
          total_amount_cents: session.amount_total,
          currency: session.currency.toUpperCase(),
          status: 'paid',
          tier: session.metadata?.price_name || 'general'
        }
        
        const { data: newOrder, error: createOrderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single()
        
        if (createOrderError || !newOrder) {
          console.error('❌ 创建订单失败:', createOrderError)
          return NextResponse.json({ 
            ok: false, 
            message: 'Failed to create order' 
          }, { status: 500 })
        }
        
        console.log('✅ 订单创建成功:', newOrder.id)
        order = newOrder
        
        // 创建票据
        const quantity = parseInt(session.metadata?.quantity || '1')
        
        for (let i = 0; i < quantity; i++) {
          const shortId = generateShortTicketId()
          
          const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              order_id: newOrder.id,
              event_id: session.metadata?.event_id,
              tier: session.metadata?.price_name || 'general',
              holder_email: session.customer_email,
              status: 'unused',
              short_id: shortId
            })
            .select()
            .single()
          
          if (!ticketError && ticket) {
            console.log('✅ 票据创建成功:', ticket.id)
          } else {
            console.error('❌ 创建票据失败:', ticketError)
          }
        }
      } catch (stripeError) {
        console.error('❌ Stripe 错误:', stripeError)
        return NextResponse.json({ 
          ok: false, 
          message: 'Failed to process payment' 
        }, { status: 500 })
      }
    }
    
    if (!order) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Order not found' 
      }, { status: 404 })
    }

    console.log('✅ 找到订单:', order.id)

    // 获取票据信息
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('order_id', order.id)

    if (ticketsError) {
      console.error('❌ 获取票据失败:', ticketsError)
      return NextResponse.json({ 
        ok: false, 
        message: 'Failed to fetch tickets' 
      }, { status: 500 })
    }

    console.log('✅ 找到票据:', tickets.length)

    // 获取活动信息（从票据中获取 event_id）
    const eventId = tickets[0]?.event_id
    let event = null
    
    if (eventId) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError) {
        console.error('❌ 获取活动信息失败:', eventError)
      } else {
        event = eventData
      }
    }

    // 为每个票据生成 qr_payload
    const ticketsWithQR = tickets.map(ticket => {
      const qrData = {
        ticket_id: ticket.id,
        short_id: ticket.short_id,
        event_id: ticket.event_id,
        tier: ticket.tier,
        holder_email: ticket.holder_email,
        event_title: event?.title || 'Event',
        event_date: event?.start_at || '',
        valid_from: ticket.created_at,
        status: ticket.status
      }

      return {
        ...ticket,
        qrPayload: JSON.stringify(qrData)
      }
    })

    return NextResponse.json({
      ok: true,
      order,
      tickets: ticketsWithQR,
      event
    })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json({ 
      ok: false, 
      message: error.message 
    }, { status: 500 })
  }
}
