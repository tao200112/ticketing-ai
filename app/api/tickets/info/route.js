import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyTicketQRPayload } from '@/lib/qr-crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

const logger = createLogger('ticket-info-api')

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      throw ErrorHandler.validationError(
        'MISSING_TOKEN',
        'Token is required'
      )
    }

    // Use admin client for public ticket info queries (no user session required)
    const supabase = supabaseAdmin
    if (!supabase) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    // Try to parse token as QR payload or use as short_id
    let ticketId = null
    let shortId = token

    // Try to parse as QR payload
    try {
      const qrResult = verifyTicketQRPayload(token)
      if (qrResult.valid) {
        ticketId = qrResult.ticketId
      }
    } catch (qrError) {
      // If QR parsing fails, treat as short_id
      logger.info('Token is not QR payload, treating as short_id', { token })
    }

    // Find ticket by ID or short_id
    let ticket, ticketError
    
    if (ticketId) {
      const result = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()
      ticket = result.data
      ticketError = result.error
    } else {
      const result = await supabase
        .from('tickets')
        .select('*')
        .eq('short_id', shortId)
        .single()
      ticket = result.data
      ticketError = result.error
    }

    if (ticketError || !ticket) {
      if (ticketError?.code === 'PGRST116') {
        throw ErrorHandler.notFoundError(
          'TICKET_NOT_FOUND',
          'Ticket not found'
        )
      }
      throw ErrorHandler.databaseError(ticketError, 'DATABASE_QUERY_ERROR')
    }

    // Get event data
    let event = null
    if (ticket.event_id) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, start_at, end_at, venue_name')
        .eq('id', ticket.event_id)
        .single()
      
      if (!eventError && eventData) {
        event = eventData
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          short_id: ticket.short_id,
          ticket_kind: ticket.ticket_kind,
          tier: ticket.tier,
          status: ticket.status,
          used: ticket.used || false,
          used_at: ticket.used_at,
          used_method: ticket.used_method,
          holder_name: ticket.holder_name,
          holder_email: ticket.holder_email,
          created_at: ticket.created_at
        },
        event
      }
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

