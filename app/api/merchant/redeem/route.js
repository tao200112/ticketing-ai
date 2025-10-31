import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyTicketQRPayload } from '@/lib/qr-crypto'

const logger = createLogger('merchant-redeem-api')

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
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured, redemption is not available'
      )
    }

    const supabase = createSupabaseClient()

    // Get user from request (this should be set by authentication middleware)
    // For now, we'll get it from the Authorization header or request body
    const authHeader = request.headers.get('authorization')
    let userId = null
    
    // Try to get user_id from body (set by frontend after login)
    if (body.user_id) {
      userId = body.user_id
    } else {
      // TODO: Implement proper JWT authentication
      // For now, throw error if no user_id provided
      throw ErrorHandler.authenticationError(
        'AUTH_REQUIRED',
        'User authentication required'
      )
    }

    // Parse QR payload to get ticket ID
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
      throw ErrorHandler.validationError(
        'INVALID_QR_FORMAT',
        'Invalid QR code format'
      )
    }

    // Get ticket first
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      logger.error('Ticket not found', { error: ticketError, ticketId })
      throw ErrorHandler.notFoundError(
        'TICKET_NOT_FOUND',
        'Ticket not found'
      )
    }

    // Get event to find merchant_id
    if (!ticket.event_id) {
      throw ErrorHandler.validationError(
        'TICKET_NO_EVENT',
        'Ticket is not associated with an event'
      )
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, merchant_id')
      .eq('id', ticket.event_id)
      .single()

    if (eventError || !event) {
      logger.error('Event not found', { error: eventError, eventId: ticket.event_id })
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found for this ticket'
      )
    }

    const ticketMerchantId = event.merchant_id

    if (!ticketMerchantId) {
      throw ErrorHandler.validationError(
        'TICKET_NO_MERCHANT',
        'Ticket is not associated with a merchant'
      )
    }

    // Get merchant to check owner
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, owner_user_id')
      .eq('id', ticketMerchantId)
      .single()

    if (merchantError || !merchant) {
      logger.error('Merchant not found', { error: merchantError, merchantId: ticketMerchantId })
      throw ErrorHandler.notFoundError(
        'MERCHANT_NOT_FOUND',
        'Merchant not found'
      )
    }

    // Check if user is a member of this merchant OR is the owner
    const { data: member, error: memberError } = await supabase
      .from('merchant_members')
      .select('merchant_id, role')
      .eq('user_id', userId)
      .eq('merchant_id', ticketMerchantId)
      .single()

    const isOwner = merchant.owner_user_id === userId
    const isMember = !memberError && member && member.merchant_id === ticketMerchantId

    if (!isOwner && !isMember) {
      logger.warn('User tried to redeem ticket from different merchant', {
        userId,
        ticketMerchantId,
        ticketId
      })
      throw ErrorHandler.authorizationError(
        'NOT_YOUR_MERCHANT_TICKET',
        '不是你们店的票'
      )
    }

    // Check ticket status
    if (ticket.status === 'used') {
      throw ErrorHandler.validationError(
        'TICKET_ALREADY_USED',
        'Ticket has already been used'
      )
    }

    if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
      throw ErrorHandler.validationError(
        'TICKET_CANNOT_BE_REDEEMED',
        'Cannot redeem a cancelled or refunded ticket'
      )
    }

    // Update ticket status to used
    const now = new Date()
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        used_at: now.toISOString(),
        redeemed_by: userId,
        redeemed_at: now.toISOString(),
        last_verified_at: now.toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      logger.error('Failed to redeem ticket', { error: updateError, ticketId })
      throw ErrorHandler.databaseError(updateError, 'REDEEM_FAILED')
    }

    logger.info('Ticket redeemed successfully', {
      ticketId,
      redeemedBy: userId,
      merchantId: ticketMerchantId
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket redeemed successfully',
      data: {
        ticket_id: ticket.short_id || ticket.id,
        status: 'used',
        redeemed_at: now.toISOString(),
        redeemed_by: userId
      }
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

