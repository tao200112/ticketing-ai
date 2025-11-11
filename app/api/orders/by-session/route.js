import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateShortTicketId } from '@/lib/ticket-utils'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null

function buildUnauthorizedResponse() {
  return NextResponse.json({ ok: false, message: 'Authentication required' }, { status: 401 })
}

function buildConfigError(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 500 })
}

function ownsOrder(order: any, userId: string, userEmail?: string | null) {
  if (!order) return false
  if (order.user_id && order.user_id === userId) return true
  if (order.customer_email && userEmail && order.customer_email === userEmail) return true

  if (order.metadata) {
    try {
      const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata
      if (metadata?.user_id && metadata.user_id === userId) {
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

async function ensureOrderOwnedByUser(order: any, userId: string) {
  if (!order) return order
  if (order.user_id === userId) return order

  const admin = supabaseAdmin
  if (!admin) return order

  const { data, error } = await admin
    .from('orders')
    .update({ user_id: userId })
    .eq('id', order.id)
    .select()
    .single()

  if (error) {
    console.warn('Failed to set order owner', error)
    return order
  }

  return data
}

async function createOrderFromStripe(sessionId: string, userId: string, userEmail?: string | null) {
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

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      user_id: userId,
      customer_email: customerEmail,
      total_amount_cents: session.amount_total,
      currency: session.currency?.toUpperCase() || 'USD',
      status: 'paid',
      metadata: {
        ...metadata,
        user_id: userId,
        customer_email: customerEmail,
      },
    })
    .select()
    .single()

  if (orderError || !order) {
    throw new Error('Failed to create order record')
  }

  // Snapshot helpers
  let eventSnapshot: any = null
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

  let priceSnapshot: any = null
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

  const ticketRows = []
  for (let i = 0; i < quantity; i += 1) {
    ticketRows.push({
      order_id: order.id,
      event_id: eventId,
      tier: priceName,
      ticket_kind: priceSnapshot?.ticket_kind || null,
      holder_email: customerEmail,
      status: 'unused',
      used: false,
      short_id: generateShortTicketId(),
      user_id: userId,
      event_title_snapshot: eventSnapshot?.title || null,
      event_description_snapshot: eventSnapshot?.description || null,
      event_venue_snapshot: eventSnapshot?.venue_name || null,
      event_address_snapshot: eventSnapshot?.address || null,
      event_start_at_snapshot: eventSnapshot?.start_at || null,
      event_end_at_snapshot: eventSnapshot?.end_at || null,
      event_poster_url_snapshot: eventSnapshot?.poster_url || null,
      price_name_snapshot: priceSnapshot?.name || priceName,
      price_amount_cents_snapshot: priceSnapshot?.amount_cents || null,
      price_currency_snapshot: priceSnapshot?.currency || 'USD',
    })
  }

  if (ticketRows.length > 0) {
    const { error: ticketError } = await admin.from('tickets').insert(ticketRows)
    if (ticketError) {
      console.warn('Failed to create ticket rows', ticketError)
    }
  }

  return order
}

function buildTicketQr(ticket: any, event: any) {
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

export async function GET(request: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return buildUnauthorizedResponse()
    }

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
      return NextResponse.json({ ok: false, message: 'Missing session_id parameter' }, { status: 400 })
    }

    let { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (orderError && orderError.code !== 'PGRST116') {
      throw orderError
    }

    if (order && !ownsOrder(order, user.id, user.email)) {
      return NextResponse.json({ ok: false, message: 'Order not found' }, { status: 404 })
    }

    if (!order) {
      order = await createOrderFromStripe(sessionId, user.id, user.email)
    } else {
      order = await ensureOrderOwnedByUser(order, user.id)
    }

    const { data: tickets = [], error: ticketsError } = await admin
      .from('tickets')
      .select('*')
      .eq('order_id', order.id)

    if (ticketsError) {
      throw ticketsError
    }

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

    const ownedTickets = tickets.filter((ticket) => {
      if (ticket.user_id && ticket.user_id === user.id) return true
      if (ticket.holder_email && user.email && ticket.holder_email === user.email) return true
      return false
    })

    // ensure ticket ownership is set for future queries
    const ticketsToClaim = ownedTickets.filter((ticket) => !ticket.user_id)
    if (ticketsToClaim.length > 0) {
      const ticketIds = ticketsToClaim.map((ticket) => ticket.id)
      await admin
        .from('tickets')
        .update({ user_id: user.id })
        .in('id', ticketIds)
    }

    const ticketsWithQR = ownedTickets.map((ticket) => buildTicketQr(ticket, event))

    return NextResponse.json({
      ok: true,
      order,
      tickets: ticketsWithQR,
      event,
    })
  } catch (error: any) {
    console.error('orders/by-session error', error)
    const message = error?.message || 'Internal Server Error'
    const status = error?.status || 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}