import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateShortTicketId } from '@/lib/ticket-utils'
import {
  getComboTicketKinds,
  getTicketKindFromPriceName,
  isComboTicket,
} from '@/lib/ticket-helpers'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null


export const runtime = 'nodejs'

function errorResponse(
  message: string,
  status: number,
  errorCode: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: errorCode,
      message,
      details,
    },
    { status },
  )
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error('[stripe/webhook] Stripe not configured')
    return errorResponse('Stripe not configured', 500, 'CONFIGURATION_ERROR')
  }

  if (!supabaseAdmin) {
    console.error('[stripe/webhook] Supabase not configured')
    return errorResponse('Supabase not configured', 500, 'CONFIGURATION_ERROR')
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET missing')
    return errorResponse('Webhook secret not configured', 500, 'CONFIGURATION_ERROR')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/webhook] Signature verification failed:', message)
    return errorResponse(
      'Webhook signature verification failed',
      400,
      'VALIDATION_ERROR',
      { message },
    )
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ success: true, data: { received: true } })
  }

  const session = event.data.object as Stripe.Checkout.Session

  try {
    const supabase = supabaseAdmin
    if (!supabase) {
      return errorResponse('Supabase not configured', 500, 'CONFIGURATION_ERROR')
    }

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({ success: true, data: { received: true } })
    }

    let authUserId =
      session.metadata?.auth_user_id ||
      session.metadata?.supabase_uid ||
      null

    if (
      authUserId === '' ||
      authUserId === 'null' ||
      authUserId === 'undefined'
    ) {
      authUserId = null
    }

    if (!authUserId && session.customer_email) {
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const matchingUser = authUsers?.users?.find(
          (user) => user.email === session.customer_email,
        )
        if (matchingUser) {
          authUserId = matchingUser.id
        }
      } catch (listError) {
        console.error(
          '[stripe/webhook] Error resolving user by email:',
          listError,
        )
      }
    }

    if (!authUserId) {
      console.error('[stripe/webhook] Missing auth_user_id in session metadata')
      return errorResponse(
        'Missing auth_user_id in checkout session metadata',
        500,
        'VALIDATION_ERROR',
      )
    }

    const customerAgeMetadata = session.metadata?.customer_age
    const customerAge =
      customerAgeMetadata && !Number.isNaN(Number(customerAgeMetadata))
        ? Number(customerAgeMetadata)
        : null

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        stripe_session_id: session.id,
        customer_email: session.customer_email,
        customer_name:
          session.metadata?.customer_name || session.customer_email || '',
        customer_age: customerAge,
        total_amount_cents: session.amount_total,
        currency: session.currency?.toUpperCase(),
        status: 'paid',
        supabase_uid: authUserId,
        metadata: {
          payment_intent: session.payment_intent,
          event_id: session.metadata?.event_id,
          tier: session.metadata?.price_name || 'general',
          auth_user_id: authUserId,
        },
      })
      .select()
      .single()

    if (orderError) {
      console.error('[stripe/webhook] Failed to create order', orderError)
      return errorResponse('Failed to create order', 500, 'DATABASE_ERROR')
    }

    const quantity = Number(session.metadata?.quantity ?? '1') || 1
    const priceId = session.metadata?.price_id
    const priceName = session.metadata?.price_name || 'general'

    let ticketKindFromPrice: string | null = null
    if (priceId) {
      const { data: priceData } = await supabase
        .from('prices')
        .select('ticket_kind')
        .eq('id', priceId)
        .maybeSingle()
      if (priceData?.ticket_kind) {
        ticketKindFromPrice = priceData.ticket_kind
      }
    }

    const comboKinds = isComboTicket(priceName, ticketKindFromPrice)
      ? getComboTicketKinds(priceName, ticketKindFromPrice)
      : []

    const ticketKindsToCreate =
      comboKinds.length > 0
        ? comboKinds
        : [
            ticketKindFromPrice ||
              getTicketKindFromPriceName(priceName) ||
              'ENTRY_21_PLUS',
          ]

    let eventId = session.metadata?.event_id
    if (
      !eventId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventId,
      )
    ) {
      const { data: defaultEvent } = await supabase
        .from('events')
        .select('id')
        .limit(1)
        .maybeSingle()
      eventId = defaultEvent?.id || '45091d37-7252-43c7-93c8-a7033d28af31'
    }

    const { data: eventData } = await supabase
      .from('events')
      .select(
        'title, description, venue_name, address, start_at, end_at, poster_url',
      )
      .eq('id', eventId)
      .maybeSingle()

    const eventSnapshot = eventData
      ? {
          title: eventData.title,
          description: eventData.description,
          venue_name: eventData.venue_name,
          address: eventData.address,
          start_at: eventData.start_at,
          end_at: eventData.end_at,
          poster_url: eventData.poster_url,
        }
      : null

    const validityStartTime = eventData?.start_at ?? null
    const validityEndTime = eventData?.end_at ?? null

    let priceSnapshot = null
    if (priceId) {
      const { data: priceData } = await supabase
        .from('prices')
        .select('name, amount_cents, currency')
        .eq('id', priceId)
        .maybeSingle()

      if (priceData) {
        priceSnapshot = {
          name: priceData.name,
          amount_cents: priceData.amount_cents,
          currency: priceData.currency || 'USD',
        }
      }
    }

    const holderName =
      session.metadata?.customer_name || session.customer_email || ''
    const holderAge = customerAge ?? null

    for (let i = 0; i < quantity; i += 1) {
      for (const ticketKind of ticketKindsToCreate) {
        const shortId = generateShortTicketId()
        const ticketPayload = {
          order_id: order.id,
          event_id: eventId,
          tier: session.metadata?.price_name || 'general',
          ticket_kind: ticketKind,
          holder_email: session.customer_email,
          holder_name: holderName,
          holder_age: holderAge,
          supabase_uid: authUserId,
          status: 'unused',
          used: false,
          short_id: shortId,
          validity_start_time: validityStartTime,
          validity_end_time: validityEndTime,
          event_snapshot: eventSnapshot,
          price_snapshot: priceSnapshot,
        }

        const { error: ticketError } = await supabase
          .from('tickets')
          .insert(ticketPayload)

        if (ticketError) {
          console.error('[stripe/webhook] Failed to create ticket', ticketError)
          return errorResponse('Failed to create ticket', 500, 'DATABASE_ERROR')
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        received: true,
      },
    })
  } catch (error) {
    console.error('[stripe/webhook] Handler failed', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500, 'INTERNAL_ERROR')
  }
}

