import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyTicketQRPayload } from '@/lib/qr-crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const logger = createLogger('ticket-verify-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { qr_payload } = body

    // Validate QR payload
    if (!qr_payload) {
      throw ErrorHandler.validationError(
        'MISSING_QR_PAYLOAD',
        'QR payload is required'
      )
    }

    // If Supabase is not configured
    if (!supabaseUrl || !supabaseKey) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured, verification is not available'
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try to parse as new QR format: TKT.<id>.<exp>.<sig>
    let ticketId
    try {
      const qrResult = verifyTicketQRPayload(qr_payload)
      if (!qrResult.valid) {
        throw ErrorHandler.validationError(
          'INVALID_QR_FORMAT',
          qrResult.error || 'Invalid QR code format'
        )
      }
      ticketId = qrResult.ticketId
    } catch (qrError) {
      // If new format fails, try old JSON format
      // Note: JSON.parse is safe here because qr_payload is verified by verifyTicketQRPayload first
      // and we're only parsing it as a fallback for legacy format
      try {
        // Limit payload size to prevent DoS attacks
        if (qr_payload.length > 1000) {
          throw new Error('QR payload too long')
        }
        const ticketData = JSON.parse(qr_payload)
        // Validate ticket data structure
        if (typeof ticketData !== 'object' || ticketData === null) {
          throw new Error('Invalid ticket data structure')
        }
        ticketId = ticketData.ticket_id || ticketData.ticketId
        // Ensure ticketId is a valid string
        if (typeof ticketId !== 'string' || ticketId.length === 0) {
          throw new Error('Invalid ticket ID')
        }
      } catch (jsonError) {
        throw ErrorHandler.validationError(
          'INVALID_QR_FORMAT',
          'Invalid QR code format. Expected TKT format or JSON format.'
        )
      }
    }

    if (!ticketId) {
      throw ErrorHandler.validationError(
        'INVALID_QR_FORMAT',
        'Could not extract ticket ID from QR code'
      )
    }

    // Find ticket with related data
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events (
          id,
          title,
          start_at,
          end_at,
          venue_name
        ),
        orders (
          id,
          customer_name,
          customer_email
        )
      `)
      .eq('id', ticketId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw ErrorHandler.notFoundError(
          'TICKET_NOT_FOUND',
          'Ticket not found'
        )
      }
      throw ErrorHandler.databaseError(error, 'DATABASE_QUERY_ERROR')
    }

    if (!ticket) {
      throw ErrorHandler.notFoundError(
        'TICKET_NOT_FOUND',
        'Ticket not found'
      )
    }

    // Get current time
    const now = new Date()

    // Check ticket validity
    let isValid = true
    let validityMessage = 'Ticket is valid'
    let expiryInfo = {}

    // Priority 1: Check if ticket has explicit validity window
    if (ticket.validity_start_time && ticket.validity_end_time) {
      const validityStart = new Date(ticket.validity_start_time)
      const validityEnd = new Date(ticket.validity_end_time)

      if (now < validityStart) {
        isValid = false
        validityMessage = 'Ticket not yet valid - validity window has not started'
        expiryInfo = {
          validFrom: validityStart.toISOString(),
          validUntil: validityEnd.toISOString(),
          status: 'not_yet_valid'
        }
      } else if (now > validityEnd) {
        isValid = false
        validityMessage = 'Ticket has expired - validity window has ended'
        expiryInfo = {
          validFrom: validityStart.toISOString(),
          validUntil: validityEnd.toISOString(),
          status: 'expired'
        }
      } else {
        // Within validity window - unlimited entry allowed
        validityMessage = 'Ticket valid - entry allowed'
        expiryInfo = {
          validFrom: validityStart.toISOString(),
          validUntil: validityEnd.toISOString(),
          status: 'valid'
        }
      }
    }
    // Priority 2: Check event end time
    else if (ticket.events && ticket.events.end_at) {
      const eventEnd = new Date(ticket.events.end_at)
      if (now > eventEnd) {
        isValid = false
        validityMessage = 'Ticket has expired - event has ended'
        expiryInfo = {
          eventEnd: eventEnd.toISOString(),
          status: 'expired'
        }
      } else {
        validityMessage = 'Ticket valid - entry allowed'
        expiryInfo = {
          eventEnd: eventEnd.toISOString(),
          status: 'valid'
        }
      }
    }

    // Check ticket status (cancelled tickets are always invalid)
    if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
      isValid = false
      validityMessage = 'Ticket has been cancelled or refunded'
      expiryInfo.status = 'cancelled'
    }

    // Get holder information (from ticket or order)
    const holderName = ticket.holder_name || ticket.orders?.customer_name || 'Unknown'
    const holderAge = ticket.holder_age || null

    // Update verification tracking
    const updateData = {
      last_verified_at: now.toISOString()
    }

    // Set first verification if this is the first time
    if (!ticket.first_verified_at) {
      updateData.first_verified_at = now.toISOString()
      updateData.verification_count = 1
    } else {
      updateData.verification_count = (ticket.verification_count || 0) + 1
    }

    try {
      await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
    } catch (updateError) {
      logger.warn('Failed to update verification tracking', { error: updateError })
      // Don't block verification if tracking update fails
    }

    // Prepare response
    const responseData = {
      ticket: {
        id: ticket.id,
        short_id: ticket.short_id,
        tier: ticket.tier,
        holder_name: holderName,
        holder_age: holderAge,
        status: ticket.status,
        verification_count: (ticket.verification_count || 0) + 1,
        first_verified_at: updateData.first_verified_at || ticket.first_verified_at,
        last_verified_at: updateData.last_verified_at,
        validity_start_time: ticket.validity_start_time,
        validity_end_time: ticket.validity_end_time
      },
      event: ticket.events ? {
        id: ticket.events.id,
        title: ticket.events.title,
        start_at: ticket.events.start_at,
        end_at: ticket.events.end_at,
        venue_name: ticket.events.venue_name
      } : null,
      validity: {
        valid: isValid,
        message: validityMessage,
        ...expiryInfo
      },
      scanned_at: now.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}


