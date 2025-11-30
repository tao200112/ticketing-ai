import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import type { Database } from '../../../types/db.ts'
import { verifyTicketPayload } from '../_shared/qr.ts'

type JsonResponse = {
  success: boolean
  error?: string
  message?: string
  data?: Record<string, unknown>
}

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const qrSalt =
  Deno.env.get('QR_SALT') ?? 'ticketing-ai-secret-salt-2024'

function response(body: JsonResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return response(
      {
        success: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST is supported',
      },
      405,
    )
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return response(
      {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Supabase credentials missing',
      },
      500,
    )
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await req.json()
    const qrPayload = body?.qr_payload as string | undefined
    const redeem = Boolean(body?.redeem)

    if (!qrPayload) {
      return response(
        {
          success: false,
          error: 'MISSING_QR_PAYLOAD',
          message: 'qr_payload is required',
        },
        400,
      )
    }

    const verification = await verifyTicketPayload(qrPayload, qrSalt)
    if (!verification.valid) {
      return response(
        {
          success: false,
          error: 'INVALID_QR_FORMAT',
          message: verification.error,
        },
        400,
      )
    }

    const { ticketId } = verification

    const {
      data: ticket,
      error: ticketError,
    } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      console.error('[validate-ticket] Ticket query failed', ticketError)
      return response(
        {
          success: false,
          error: 'DATABASE_QUERY_ERROR',
          message: 'Failed to fetch ticket',
        },
        500,
      )
    }

    if (!ticket) {
      return response(
        {
          success: false,
          error: 'TICKET_NOT_FOUND',
          message: 'Ticket not found',
        },
        404,
      )
    }

    let event = null
    if (ticket.event_id) {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, start_at, end_at, venue_name, merchant_id')
        .eq('id', ticket.event_id)
        .maybeSingle()
      if (eventData) {
        event = eventData
      }
    }

    let order = null
    if (ticket.order_id) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_name, customer_email, customer_age')
        .eq('id', ticket.order_id)
        .maybeSingle()
      if (orderData) {
        order = orderData
      }
    }

    const now = new Date()
    let validityMessage = 'Ticket valid'
    let validityStatus: 'valid' | 'expired' | 'not_yet_valid' | 'used' | 'cancelled' =
      'valid'

    if (ticket.validity_start_time && ticket.validity_end_time) {
      const start = new Date(ticket.validity_start_time)
      const end = new Date(ticket.validity_end_time)

      if (now < start) {
        validityStatus = 'not_yet_valid'
        validityMessage = 'Ticket not yet valid'
      } else if (now > end) {
        validityStatus = 'expired'
        validityMessage = 'Ticket expired'
      }
    } else if (event?.end_at) {
      const eventEnd = new Date(event.end_at)
      if (now > eventEnd) {
        validityStatus = 'expired'
        validityMessage = 'Event has already ended'
      }
    }

    if (ticket.status === 'used') {
      validityStatus = 'used'
      validityMessage = 'Ticket already used'
    } else if (
      ticket.status === 'refunded' ||
      ticket.status === 'cancelled'
    ) {
      validityStatus = 'cancelled'
      validityMessage = 'Ticket is cancelled or refunded'
    }

    const holderName =
      ticket.holder_name && ticket.holder_name.trim() !== ''
        ? ticket.holder_name
        : order?.customer_name || 'Unknown'

    const holderAge =
      ticket.holder_age && ticket.holder_age > 0
        ? ticket.holder_age
        : order?.customer_age || null

    const updateData: Record<string, unknown> = {
      last_verified_at: now.toISOString(),
    }

    if (!ticket.first_verified_at) {
      updateData.first_verified_at = now.toISOString()
      updateData.verification_count = 1
    } else {
      updateData.verification_count = (ticket.verification_count || 0) + 1
    }

    const MAX_REDEMPTIONS = 3
    let updatedStatus = ticket.status

    if (
      redeem &&
      validityStatus === 'valid' &&
      ticket.status !== 'used' &&
      ticket.status !== 'refunded' &&
      ticket.status !== 'cancelled'
    ) {
      const verificationCount = Number(updateData.verification_count) || 1
      if (verificationCount >= MAX_REDEMPTIONS) {
        updateData.status = 'used'
        updateData.used = true
        updateData.used_at = now.toISOString()
        updatedStatus = 'used'
        validityStatus = 'used'
        validityMessage =
          'Ticket redeemed successfully (all scans consumed)'
      } else {
        validityMessage = `Ticket redeemed (${verificationCount}/${MAX_REDEMPTIONS})`
      }
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticket.id)

    if (updateError) {
      console.error('[validate-ticket] Failed to update ticket', updateError)
      if (redeem) {
        return response(
          {
            success: false,
            error: 'REDEEM_FAILED',
            message: 'Failed to redeem ticket',
          },
          500,
        )
      }
    }

    const responseTicket = {
      id: ticket.id,
      short_id: ticket.short_id,
      tier: ticket.tier,
      holder_name: holderName,
      holder_age: holderAge,
      status: updatedStatus,
      used_at: updateData.used_at ?? ticket.used_at ?? null,
      verification_count:
        Number(updateData.verification_count) ??
        ticket.verification_count ??
        1,
      validity_start_time: ticket.validity_start_time,
      validity_end_time: ticket.validity_end_time,
    }

    const validityPayload = {
      valid: validityStatus === 'valid',
      message: validityMessage,
      status: validityStatus,
      validFrom: ticket.validity_start_time ?? null,
      validUntil: ticket.validity_end_time ?? event?.end_at ?? null,
    }

    return response({
      success: true,
      data: {
        ticket: responseTicket,
        event,
        validity: validityPayload,
        scanned_at: now.toISOString(),
      },
    })
  } catch (error) {
    console.error('[validate-ticket] Unexpected failure', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return response(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message,
      },
      500,
    )
  }
})

