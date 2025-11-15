import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseUser } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateShortTicketId } from '@/lib/ticket-utils'
import { isComboTicket, getComboTicketKinds } from '@/lib/ticket-helpers'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null

// buildUnauthorizedResponse function removed - not used

function buildConfigError(message) {
  return NextResponse.json({ 
    success: false,
    error: 'CONFIGURATION_ERROR',
    message 
  }, { status: 500 })
}

function ownsOrder(order, authUserId, userEmail) {
  if (!order) return false
  
  // 优先使用 supabase_uid 验证（数据库字段存储 Supabase Auth UID）
  if (order.supabase_uid && order.supabase_uid === authUserId) return true
  
  // 回退到邮箱匹配（用于未登录用户）
  if (order.customer_email && userEmail && order.customer_email === userEmail) return true

  // 检查 metadata 中的身份标识
  if (order.metadata) {
    try {
      const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata
      const metadataAuthId = metadata?.auth_user_id || metadata?.supabase_uid
      if (metadataAuthId && metadataAuthId === authUserId) {
        return true
      }
      if (metadata?.customer_email && userEmail && metadata.customer_email === userEmail) {
        return true
      }
    } catch (error) {
      console.warn('Failed to parse order metadata', error)
    }
  }

  return false
}

async function ensureOrderOwnedByUser(order, authUserId) {
  if (!order) return order
  if (order.supabase_uid === authUserId) return order

  const admin = supabaseAdmin
  if (!admin) return order

  const { data, error } = await admin
    .from('orders')
    .update({ supabase_uid: authUserId })
    .eq('id', order.id)
    .select()
    .single()

  if (error) {
    console.warn('Failed to set order owner', error)
    return order
  }

  return data
}

async function createOrderFromStripe(sessionId, authUserId, userEmail) {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  const admin = supabaseAdmin
  if (!admin) {
    throw new Error('Supabase admin client not configured')
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const customerEmail = session.customer_email || userEmail || null
  const metadata = session.metadata || {}
  const eventId = metadata.event_id || null
  const priceId = metadata.price_id || null
  const priceName = metadata.price_name || 'general'
  const quantity = parseInt(metadata.quantity || '1', 10) || 1

  // 从 metadata 获取身份标识（优先），如果没有则使用传入的 authUserId
  // 支持新字段名 auth_user_id 和旧字段名 supabase_uid（向后兼容）
  const finalAuthUserId = metadata.auth_user_id || metadata.supabase_uid || authUserId || null
  
  if (!finalAuthUserId) {
    console.warn('[OrdersBySession] Missing auth_user_id in metadata')
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      supabase_uid: finalAuthUserId, // Database field stores Supabase Auth UID
      customer_email: customerEmail,
      total_amount_cents: session.amount_total,
      currency: session.currency?.toUpperCase() || 'USD',
      status: 'paid',
      metadata: {
        ...metadata,
        auth_user_id: finalAuthUserId, // Unified identity in metadata
        customer_email: customerEmail,
      },
    })
    .select()
    .single()

  if (orderError || !order) {
    throw new Error('Failed to create order record')
  }

  // Snapshot helpers
  let eventSnapshot = null
  if (eventId) {
    const { data: eventData } = await admin
      .from('events')
      .select('title, description, venue_name, address, start_at, end_at, poster_url')
      .eq('id', eventId)
      .single()

    if (eventData) {
      eventSnapshot = {
        title: eventData.title,
        description: eventData.description,
        venue_name: eventData.venue_name,
        address: eventData.address,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        poster_url: eventData.poster_url,
      }
    }
  }

  let priceSnapshot = null
  if (priceId) {
    const { data: priceData } = await admin
      .from('prices')
      .select('name, amount_cents, currency, ticket_kind')
      .eq('id', priceId)
      .single()

    if (priceData) {
      priceSnapshot = {
        name: priceData.name,
        amount_cents: priceData.amount_cents,
        currency: priceData.currency || 'USD',
        ticket_kind: priceData.ticket_kind,
      }
    }
  }

  // Check if this is a combo ticket and determine ticket kinds to create
  const ticketKindFromPrice = priceSnapshot?.ticket_kind || null
  const isCombo = isComboTicket(priceName, ticketKindFromPrice)
  
  let ticketKindsToCreate = []
  if (isCombo) {
    // Combo tickets MUST create two separate tickets: ENTRY_COMBO and DRINK_COMBO
    ticketKindsToCreate = getComboTicketKinds(priceName, ticketKindFromPrice)
    console.log(`[createOrderFromStripe] Combo ticket detected, will create tickets:`, ticketKindsToCreate)
    
    // Safety check: ensure we have exactly 2 tickets for combo
    if (ticketKindsToCreate.length !== 2) {
      console.error(`[createOrderFromStripe] ERROR: Combo ticket should create 2 tickets, but got ${ticketKindsToCreate.length}. Using default combo kinds.`)
      ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
    }
  } else {
    // Single ticket - use ticket_kind from price or determine from price name
    const singleKind = ticketKindFromPrice || null
    ticketKindsToCreate = singleKind ? [singleKind] : [null]
  }

  const ticketRows = []
  // For combo tickets, create multiple tickets per quantity
  // Each quantity unit creates all ticket kinds (e.g., 1 combo = 2 tickets, 2 combos = 4 tickets)
  for (let i = 0; i < quantity; i += 1) {
    for (const ticketKind of ticketKindsToCreate) {
      ticketRows.push({
        order_id: order.id,
        event_id: eventId,
        tier: priceName,
        ticket_kind: ticketKind,
        holder_email: customerEmail,
        status: 'unused',
        used: false,
        short_id: generateShortTicketId(),
        supabase_uid: authUserId, // Database field stores Supabase Auth UID
        event_snapshot: eventSnapshot || null,
        price_snapshot: priceSnapshot || null
      })
    }
  }

  if (ticketRows.length > 0) {
    const { data: insertedTickets, error: ticketError } = await admin
      .from('tickets')
      .insert(ticketRows)
      .select()
    
    if (ticketError) {
      console.error('Failed to create ticket rows:', ticketError)
      // Don't throw error here, let the caller handle it
      // The main function will check if tickets exist and create them if needed
      console.warn('Order created but tickets failed to create. Error:', ticketError.message)
    } else {
      console.log(`Successfully created ${insertedTickets?.length || 0} tickets for order ${order.id}`)
    }
  }

  return order
}

function buildTicketQr(ticket, event) {
  const qrData = {
    ticket_id: ticket.id,
    short_id: ticket.short_id,
    event_id: ticket.event_id,
    tier: ticket.tier,
    holder_email: ticket.holder_email,
    event_title: event?.title || 'Event',
    event_date: event?.start_at || '',
    valid_from: ticket.created_at,
    status: ticket.status,
  }

  return {
    ...ticket,
    qrPayload: JSON.stringify(qrData),
  }
}

export async function GET(request) {
  try {
    // Get user identity (optional - for ownership verification)
    // This endpoint allows unauthenticated access (for Stripe session verification)
    const user = await getSupabaseUser()
    const authUserId = user?.id || null
    const userEmail = user?.email || null

    if (!stripe) {
      return buildConfigError('Stripe not configured')
    }

    const admin = supabaseAdmin
    if (!admin) {
      return buildConfigError('Supabase Service Role not configured')
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ 
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing session_id parameter' 
      }, { status: 400 })
    }

    // Verify Stripe session first
    let stripeSession
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
      
      // Ensure session is paid
      if (stripeSession.payment_status !== 'paid') {
        return NextResponse.json({ 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Payment not completed' 
        }, { status: 400 })
      }
    } catch (stripeError) {
      console.error('Stripe session retrieval error:', stripeError)
      return NextResponse.json({ 
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid session ID' 
      }, { status: 400 })
    }

    // Get customer email from Stripe session
    const customerEmail = stripeSession.customer_email || 
                          stripeSession.customer_details?.email || 
                          userEmail || 
                          null

    // Check if order exists
    let { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (orderError && orderError.code !== 'PGRST116') {
      throw orderError
    }

    // If order exists, verify ownership
    if (order) {
      // If user is logged in, check ownership
      if (user && authUserId) {
        if (!ownsOrder(order, authUserId, userEmail)) {
          // Check if customer email matches
          if (customerEmail && order.customer_email === customerEmail) {
            // Allow access if email matches, and try to link user if logged in
            if (authUserId && !order.supabase_uid) {
              order = await ensureOrderOwnedByUser(order, authUserId)
            }
          } else {
            return NextResponse.json({ 
              success: false,
              error: 'NOT_FOUND',
              message: 'Order not found' 
            }, { status: 404 })
          }
        } else {
          order = await ensureOrderOwnedByUser(order, authUserId)
        }
      } else {
        // If not logged in, check if customer email matches
        if (customerEmail && order.customer_email !== customerEmail) {
          return NextResponse.json({ 
            success: false,
            error: 'NOT_FOUND',
            message: 'Order not found' 
          }, { status: 404 })
        }
      }
    } else {
      // Order doesn't exist, create it from Stripe session
      try {
        order = await createOrderFromStripe(sessionId, authUserId, customerEmail)
      } catch (createError) {
        console.error('Error creating order from Stripe:', createError)
        return NextResponse.json({ 
          success: false,
          error: 'INTERNAL_ERROR',
          message: createError.message || 'Failed to create order' 
        }, { status: 500 })
      }
    }

    // Get tickets for this order
    const { data: tickets = [], error: ticketsError } = await admin
      .from('tickets')
      .select('*')
      .eq('order_id', order.id)

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      throw ticketsError
    }

    // If no tickets exist, this means createOrderFromStripe didn't create them
    // Try to create them now
    if (tickets.length === 0) {
      
      const metadata = stripeSession.metadata || {}
      const eventId = metadata.event_id || null
      const priceId = metadata.price_id || null
      const priceName = metadata.price_name || 'general'
      const quantity = parseInt(metadata.quantity || '1', 10) || 1

      // Get event snapshot
      let eventSnapshot = null
      if (eventId) {
        const { data: eventData } = await admin
          .from('events')
          .select('title, description, venue_name, address, start_at, end_at, poster_url')
          .eq('id', eventId)
          .single()

        if (eventData) {
          eventSnapshot = {
            title: eventData.title,
            description: eventData.description,
            venue_name: eventData.venue_name,
            address: eventData.address,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            poster_url: eventData.poster_url,
          }
        }
      }

      // Get price snapshot
      let priceSnapshot = null
      if (priceId) {
        const { data: priceData } = await admin
          .from('prices')
          .select('name, amount_cents, currency, ticket_kind')
          .eq('id', priceId)
          .single()

        if (priceData) {
          priceSnapshot = {
            name: priceData.name,
            amount_cents: priceData.amount_cents,
            currency: priceData.currency || 'USD',
            ticket_kind: priceData.ticket_kind,
          }
        }
      }

      // 从 metadata 获取身份标识（优先），如果没有则使用 authUserId
      // 支持新字段名 auth_user_id 和旧字段名 supabase_uid（向后兼容）
      const authUserIdFromMetadata = stripeSession.metadata?.auth_user_id || stripeSession.metadata?.supabase_uid || authUserId || null

      // Check if this is a combo ticket and determine ticket kinds to create
      const ticketKindFromPrice = priceSnapshot?.ticket_kind || null
      const isCombo = isComboTicket(priceName, ticketKindFromPrice)
      
      let ticketKindsToCreate = []
      if (isCombo) {
        // Combo tickets MUST create two separate tickets: ENTRY_COMBO and DRINK_COMBO
        ticketKindsToCreate = getComboTicketKinds(priceName, ticketKindFromPrice)
        
        // Safety check: ensure we have exactly 2 tickets for combo
        if (ticketKindsToCreate.length !== 2) {
          console.error('[OrdersBySession] ERROR: Combo ticket should create 2 tickets, but got', ticketKindsToCreate.length)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
        
        // Verify both ticket kinds are present
        if (!ticketKindsToCreate.includes('ENTRY_COMBO') || !ticketKindsToCreate.includes('DRINK_COMBO')) {
          console.error('[OrdersBySession] ERROR: Combo ticket missing required kinds. Got:', ticketKindsToCreate)
          ticketKindsToCreate = ['ENTRY_COMBO', 'DRINK_COMBO']
        }
      } else {
        // Single ticket - determine kind from price or metadata
        const singleKind = ticketKindFromPrice || null
        ticketKindsToCreate = singleKind ? [singleKind] : [null]
      }

      // Create tickets: for combo tickets, create multiple tickets per quantity
      // Each quantity unit creates all ticket kinds (e.g., 1 combo = 2 tickets, 2 combos = 4 tickets)
      const ticketRows = []
      for (let i = 0; i < quantity; i++) {
        for (const ticketKind of ticketKindsToCreate) {
          ticketRows.push({
            order_id: order.id,
            event_id: eventId,
            tier: priceName,
            ticket_kind: ticketKind,
            holder_email: customerEmail,
            status: 'unused',
            used: false,
            short_id: generateShortTicketId(),
            supabase_uid: authUserIdFromMetadata, // Database field stores Supabase Auth UID
            event_snapshot: eventSnapshot || null,
            price_snapshot: priceSnapshot || null
          })
        }
      }

      if (ticketRows.length > 0) {
        const { data: newTickets, error: ticketError } = await admin
          .from('tickets')
          .insert(ticketRows)
          .select()

        if (ticketError) {
          console.error('Failed to create ticket rows:', ticketError)
          return NextResponse.json({ 
            success: false,
            error: 'DATABASE_ERROR',
            message: 'Failed to create tickets: ' + ticketError.message 
          }, { status: 500 })
        }
        
        // Update tickets array with newly created tickets
        tickets.push(...(newTickets || []))
      }
    }

    // Get event information
    const eventId = tickets[0]?.event_id
    let event = null

    if (eventId) {
      const { data: eventData, error: eventError } = await admin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!eventError) {
        event = eventData
      }
    }

    // Filter tickets based on auth identity only
    let ownedTickets = tickets
    if (user && authUserId) {
      // 只使用 supabase_uid 匹配（数据库字段存储 Supabase Auth UID）
      ownedTickets = tickets.filter((ticket) => ticket.supabase_uid === authUserId)

      // Ensure ticket ownership is set for future queries
      const ticketsToClaim = ownedTickets.filter((ticket) => !ticket.supabase_uid)
      if (ticketsToClaim.length > 0 && authUserId) {
        const ticketIds = ticketsToClaim.map((ticket) => ticket.id)
        await admin
          .from('tickets')
          .update({ supabase_uid: authUserId })
          .in('id', ticketIds)
      }
    } else {
      // If not logged in, return empty array (RLS will block anyway)
      ownedTickets = []
    }

    // Build QR codes for tickets
    const ticketsWithQR = ownedTickets.map((ticket) => buildTicketQr(ticket, event))

    return NextResponse.json({
      success: true,
      data: {
        order,
        tickets: ticketsWithQR,
        event,
      }
    })
  } catch (error) {
    console.error('orders/by-session error', error)
    const message = error?.message || 'Internal Server Error'
    const status = error?.status || 500
    return NextResponse.json({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message 
    }, { status })
  }
}