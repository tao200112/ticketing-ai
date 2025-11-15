import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyTicketQRPayload } from '@/lib/qr-crypto'
import { getServerAuthIdentity } from '@/lib/auth-identity'

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

    // Get current user identity from AuthContext
    const authIdentity = await getServerAuthIdentity()

    if (!authIdentity || !authIdentity.id) {
      throw ErrorHandler.authenticationError(
        'AUTHENTICATION_REQUIRED',
        'User must be logged in to redeem tickets'
      )
    }

    const authUserId = authIdentity.id // Unified identity: Supabase Auth UID

    logger.info('Merchant redemption request', { 
      authUserId
    })

    // Parse QR payload to get ticket ID
    // Support both new TKT format and old JSON format
    let ticketId
    try {
      // Try new TKT format first
      const qrResult = verifyTicketQRPayload(qr_payload)
      if (!qrResult.valid) {
        throw new Error(qrResult.error || 'Invalid TKT format')
      }
      ticketId = qrResult.ticketId
    } catch (qrError) {
      // If new format fails, try old JSON format
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
        logger.info('Using legacy JSON format for QR payload', { ticketId })
      } catch (jsonError) {
        logger.error('Failed to parse QR payload', { error: jsonError, qrPayload: qr_payload.substring(0, 100) })
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
      .select('id, owner_supabase_uid')
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
    // 使用 supabase_uid 查询（数据库字段存储 Supabase Auth UID）
    const { data: member, error: memberError } = await supabase
      .from('merchant_members')
      .select('merchant_id, role')
      .eq('supabase_uid', authUserId)
      .eq('merchant_id', ticketMerchantId)
      .single()

    // 验证所有权：优先使用 owner_supabase_uid（数据库字段存储 Supabase Auth UID）
    const isOwner = merchant.owner_supabase_uid && merchant.owner_supabase_uid === authUserId
    const isMember = !memberError && member && member.merchant_id === ticketMerchantId

    if (!isOwner && !isMember) {
      logger.warn('User tried to redeem ticket from different merchant', {
        authUserId,
        ticketMerchantId,
        ticketId
      })
      throw ErrorHandler.authorizationError(
        'NOT_YOUR_MERCHANT_TICKET',
        'This ticket does not belong to your merchant'
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
        used: true,
        used_at: now.toISOString(),
        redeemed_by_supabase_uid: authUserId,  // Database field stores Supabase Auth UID
        redeemed_at: now.toISOString(),
        last_verified_at: now.toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      logger.error('Failed to redeem ticket', { error: updateError, ticketId })
      throw ErrorHandler.databaseError(updateError, 'REDEEM_FAILED')
    }

    // Create redemption log entry
    const { error: redemptionLogError } = await supabase
      .from('ticket_redemptions')
      .insert({
        ticket_id: ticketId,
        supabase_uid: ticket.supabase_uid || null,  // 票务所有者的 supabase_uid
        redeemed_by_supabase_uid: authUserId,  // Operator (merchant staff) Supabase Auth UID
        ticket_kind: ticket.ticket_kind,
        redeemed_at: now.toISOString(),
        redeem_source: 'merchant_scan',
        redeem_location: 'door',  // 默认位置，可以根据实际情况调整
        metadata: {
          method: 'merchant_scan',
          ticket_id: ticketId,
          merchant_id: ticketMerchantId,
          auth_user_id: authUserId // Unified identity in metadata
        }
      })

    if (redemptionLogError) {
      // Log error but don't fail the redemption (non-critical)
      logger.warn('Failed to create redemption log (non-critical)', { 
        error: redemptionLogError, 
        ticketId 
      })
    } else {
      logger.info('Redemption log created', { ticketId, authUserId })
    }

    logger.info('Ticket redeemed successfully', {
      ticketId,
      redeemedBy: authUserId,
      merchantId: ticketMerchantId
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket redeemed successfully',
      data: {
        ticket_id: ticket.short_id || ticket.id,
        status: 'used',
        redeemed_at: now.toISOString(),
        redeemed_by_supabase_uid: authUserId
      }
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

