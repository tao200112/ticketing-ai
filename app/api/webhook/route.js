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

      // 获取 Supabase Auth UID（优先从 metadata，其次通过邮箱查找）
      let supabaseUid = null
      if (session.metadata?.supabase_uid) {
        supabaseUid = session.metadata.supabase_uid
      } else if (session.customer_email) {
        // 通过邮箱从 auth.users 查找 Supabase UID
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const matchingUser = authUsers?.users?.find(u => u.email === session.customer_email)
        if (matchingUser) {
          supabaseUid = matchingUser.id
          console.log('✅ 通过邮箱找到 Supabase UID:', supabaseUid)
        }
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
          supabase_uid: supabaseUid, // 使用 Supabase Auth UID
          metadata: {
            payment_intent: session.payment_intent,
            event_id: session.metadata?.event_id,
            tier: session.metadata?.price_name || 'general',
            user_id: session.metadata?.user_id || null,
            supabase_uid: supabaseUid
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
      console.log(`🔍 Checking combo status - priceName: "${priceName}", ticketKindFromPrice: "${ticketKindFromPrice}"`)
      const isCombo = isComboTicket(priceName, ticketKindFromPrice)
      console.log(`🔍 isCombo result: ${isCombo}`)
      
      // For combo tickets, get both ENTRY_COMBO and DRINK_COMBO
      // For non-combo tickets, get the single ticket kind
      let ticketKindsToCreate = []
      if (isCombo) {
        // Combo tickets MUST create two separate tickets
        ticketKindsToCreate = getComboTicketKinds(priceName, ticketKindFromPrice)
        console.log('🎫 Combo ticket detected, will create tickets:', ticketKindsToCreate)
        
        // Safety check: ensure we have exactly 2 tickets for combo
        if (ticketKindsToCreate.length !== 2) {
          console.error(`❌ ERROR: Combo ticket should create 2 tickets, but got ${ticketKindsToCreate.length}. Using default combo kinds.`)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
        
        // Verify both ticket kinds are present
        if (!ticketKindsToCreate.includes('ENTRY_COMBO') || !ticketKindsToCreate.includes('DRINK_COMBO')) {
          console.error(`❌ ERROR: Combo ticket missing required kinds. Got: ${ticketKindsToCreate}. Using default.`)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
      } else {
        // Single ticket - determine kind from price or metadata
        const singleKind = ticketKindFromPrice || getTicketKindFromPriceName(priceName) || null
        if (singleKind) {
          ticketKindsToCreate = [singleKind]
        } else {
          console.warn('⚠️ Could not determine ticket_kind, defaulting to ENTRY_21_PLUS')
          ticketKindsToCreate = ['ENTRY_21_PLUS']
        }
      }
      
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
          console.warn('⚠️ 获取活动信息失败:', eventDataError)
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
      // Each quantity unit creates all ticket kinds (e.g., 1 combo = 2 tickets, 2 combos = 4 tickets)
      console.log(`📝 Creating ${ticketKindsToCreate.length} ticket(s) per quantity unit. Total quantity: ${quantity}. Ticket kinds:`, ticketKindsToCreate)
      
      for (let i = 0; i < quantity; i++) {
        for (const ticketKind of ticketKindsToCreate) {
          const shortId = generateShortTicketId()
          
          console.log(`  Creating ticket ${i + 1}/${quantity} with kind: ${ticketKind}`)
          
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
            supabase_uid: supabaseUid, // 使用 Supabase Auth UID
            status: 'unused',
            used: false,
            short_id: shortId,
            validity_start_time: validityStartTime,
            validity_end_time: validityEndTime,
            // Event snapshot fields
            event_title_snapshot: eventSnapshot?.title || null,
            event_description_snapshot: eventSnapshot?.description || null,
            event_venue_snapshot: eventSnapshot?.venue_name || null,
            event_address_snapshot: eventSnapshot?.address || null,
            event_start_at_snapshot: eventSnapshot?.start_at || null,
            event_end_at_snapshot: eventSnapshot?.end_at || null,
            event_poster_url_snapshot: eventSnapshot?.poster_url || null,
            // Price snapshot fields
            price_name_snapshot: priceSnapshot?.name || session.metadata?.price_name || null,
            price_amount_cents_snapshot: priceSnapshot?.amount_cents || null,
            price_currency_snapshot: priceSnapshot?.currency || 'USD'
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
