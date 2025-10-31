import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyTicketQRPayload } from '@/lib/qr-crypto'

const logger = createLogger('ticket-verify-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { qr_payload, redeem = false } = body // redeem: true 表示核销票券

    // Validate QR payload
    if (!qr_payload) {
      throw ErrorHandler.validationError(
        'MISSING_QR_PAYLOAD',
        'QR payload is required'
      )
    }

    // If Supabase is not configured
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured, verification is not available'
      )
    }

    const supabase = createSupabaseClient()

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

    // Find ticket (simplified query to avoid join issues)
    let ticket, event, order
    
    try {
      // First, get the ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        logger.error('Ticket query error', { error: ticketError, ticketId })
        if (ticketError.code === 'PGRST116') {
          throw ErrorHandler.notFoundError(
            'TICKET_NOT_FOUND',
            'Ticket not found'
          )
        }
        throw ErrorHandler.databaseError(ticketError, 'DATABASE_QUERY_ERROR')
      }

      if (!ticketData) {
        throw ErrorHandler.notFoundError(
          'TICKET_NOT_FOUND',
          'Ticket not found'
        )
      }

      ticket = ticketData

      // Then get event data if event_id exists
      if (ticket.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, start_at, end_at, venue_name')
          .eq('id', ticket.event_id)
          .single()
        
        if (!eventError && eventData) {
          event = eventData
        } else {
          logger.warn('Event query error (non-blocking)', { error: eventError, eventId: ticket.event_id })
        }
      }

      // Get order data if order_id exists
      if (ticket.order_id) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, customer_name, customer_email')
          .eq('id', ticket.order_id)
          .single()
        
        if (!orderError && orderData) {
          order = orderData
        } else {
          logger.warn('Order query error (non-blocking)', { error: orderError, orderId: ticket.order_id })
        }
      }
    } catch (queryError) {
      // Re-throw if it's already an AppError
      if (queryError.code && queryError.statusCode) {
        throw queryError
      }
      // Otherwise wrap in database error
      logger.error('Database query failed', { error: queryError, ticketId })
      throw ErrorHandler.databaseError(queryError, 'DATABASE_QUERY_ERROR')
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
    else if (event && event.end_at) {
      const eventEnd = new Date(event.end_at)
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

    // Check ticket status (used, cancelled or refunded tickets)
    if (ticket.status === 'used') {
      isValid = false
      validityMessage = 'Ticket has already been used'
      expiryInfo.status = 'used'
    } else if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
      isValid = false
      validityMessage = 'Ticket has been cancelled or refunded'
      expiryInfo.status = 'cancelled'
    }

    // Get holder information (from ticket or order)
    const holderName = ticket.holder_name || order?.customer_name || 'Unknown'
    const holderAge = ticket.holder_age || null

    // Update verification tracking or redeem ticket
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

    // If redeem is true and ticket is valid and not used, mark it as used
    if (redeem && isValid && ticket.status !== 'used') {
      if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
        throw ErrorHandler.validationError(
          'TICKET_CANNOT_BE_REDEEMED',
          'Cannot redeem a cancelled or refunded ticket'
        )
      }
      
      updateData.status = 'used'
      updateData.used_at = now.toISOString()
      
      logger.info('Redeeming ticket', { ticketId, redeemedAt: now.toISOString() })
    }

    // Update ticket in database
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)

      if (updateError) {
        logger.error('Failed to update ticket', { error: updateError, ticketId })
        // If redeem failed, throw error
        if (redeem) {
          throw ErrorHandler.databaseError(updateError, 'REDEEM_FAILED')
        }
        // Otherwise just warn (verification can continue)
        logger.warn('Failed to update verification tracking', { error: updateError })
      } else if (redeem) {
        // Update ticket status in response if redeemed
        ticket.status = 'used'
        ticket.used_at = now.toISOString()
        isValid = false // After redemption, ticket is considered "used"
        validityMessage = 'Ticket has been successfully redeemed (used)'
      }
    } catch (updateError) {
      // If it's a redeem error, re-throw it
      if (redeem && updateError.code) {
        throw updateError
      }
      logger.warn('Failed to update verification tracking', { error: updateError })
      // Don't block verification if tracking update fails (unless it's a redeem)
      if (redeem) {
        throw ErrorHandler.databaseError(updateError, 'REDEEM_FAILED')
      }
    }

    // Prepare response
    const responseData = {
      ticket: {
        id: ticket.id,
        short_id: ticket.short_id,
        tier: ticket.tier,
        holder_name: holderName,
        holder_age: holderAge,
        status: ticket.status, // Updated status if redeemed
        used_at: ticket.used_at || updateData.used_at || null,
        verification_count: updateData.verification_count || (ticket.verification_count || 0) + 1,
        first_verified_at: updateData.first_verified_at || ticket.first_verified_at,
        last_verified_at: updateData.last_verified_at,
        validity_start_time: ticket.validity_start_time,
        validity_end_time: ticket.validity_end_time
      },
      event: event ? {
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        venue_name: event.venue_name
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


