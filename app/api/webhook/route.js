import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_JVzc3itvZMUN7l3Ig3A4MatQfB0XCqlr'

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

      // 创建订单
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          stripe_session_id: session.id,
          customer_email: session.customer_email,
          customer_name: session.metadata?.customer_name || session.customer_email,
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
      const tickets = []

      for (let i = 0; i < quantity; i++) {
        const shortId = generateShortTicketId()
        
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            order_id: order.id,
            event_id: session.metadata?.event_id,
            tier: session.metadata?.price_name || 'general',
            holder_email: session.customer_email,
            status: 'unused',
            short_id: shortId
          })
          .select()
          .single()

        if (ticketError) {
          console.error('❌ 创建票据失败:', ticketError)
        } else {
          console.log('✅ 票据创建成功:', ticket.id)
          tickets.push(ticket)
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

function generateShortTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
