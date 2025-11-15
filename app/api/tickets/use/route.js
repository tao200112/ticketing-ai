import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getTicketRedemptionLocation } from '@/lib/ticket-helpers'
import { getServerAuthIdentity } from '@/lib/auth-identity'

const logger = createLogger('ticket-use-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { ticket_id } = body

    if (!ticket_id) {
      throw ErrorHandler.validationError(
        'MISSING_TICKET_ID',
        'Ticket ID is required'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // Get current user identity from AuthContext
    const authIdentity = await getServerAuthIdentity()

    if (!authIdentity || !authIdentity.id) {
      throw ErrorHandler.unauthorizedError(
        'AUTHENTICATION_REQUIRED',
        'User must be logged in to redeem tickets'
      )
    }

    const authUserId = authIdentity.id // Unified identity: Supabase Auth UID
    const userEmail = authIdentity.email

    logger.info('Ticket redemption request', { 
      ticket_id, 
      authUserId
    })

    // Fetch ticket (simplified query - avoid complex joins that might fail)
    // First, get ticket without order join to avoid potential RLS issues
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, supabase_uid, holder_email, status, used, used_at, order_id, event_id, ticket_kind')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      logger.error('Ticket query error', { error: ticketError, ticket_id })
      if (ticketError?.code === 'PGRST116') {
        throw ErrorHandler.notFoundError(
          'TICKET_NOT_FOUND',
          'Ticket not found'
        )
      }
      throw ErrorHandler.databaseError(ticketError, 'DATABASE_QUERY_ERROR')
    }

    // Fetch order data separately if order_id exists (avoid join issues)
    let orderData = null
    if (ticket.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('customer_email, metadata, supabase_uid')
        .eq('id', ticket.order_id)
        .single()
      
      if (!orderError && order) {
        orderData = order
      } else {
        logger.warn('Order query failed (non-blocking)', { error: orderError, order_id: ticket.order_id })
      }
    }

    // Verify ticket belongs to the user
    // 优先使用 supabase_uid 验证（数据库字段存储 Supabase Auth UID）
    const ticketAuthId = ticket.supabase_uid
    const orderAuthId = orderData?.supabase_uid
    
    // 验证所有权：优先使用 supabase_uid，回退到邮箱匹配
    const isOwner = 
      (ticketAuthId && ticketAuthId === authUserId) ||
      (orderAuthId && orderAuthId === authUserId) ||
      (ticket.holder_email && ticket.holder_email === userEmail) ||
      (orderData?.customer_email && orderData.customer_email === userEmail)
    
    logger.info('Ticket ownership check', {
      ticket_id,
      authUserId,
      ticketAuthId,
      orderAuthId,
      ticketHolderEmail: ticket.holder_email,
      orderEmail: orderData?.customer_email,
      userEmail,
      isOwner,
      hasOrder: !!orderData
    })

    if (!isOwner) {
      throw ErrorHandler.unauthorizedError(
        'TICKET_NOT_OWNED',
        'You can only use your own tickets'
      )
    }

    // Check if ticket is already used
    if (ticket.used || ticket.status === 'used') {
      throw ErrorHandler.validationError(
        'TICKET_ALREADY_USED',
        'Ticket has already been used'
      )
    }

    // Check if ticket is cancelled or refunded
    if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
      throw ErrorHandler.validationError(
        'TICKET_CANNOT_BE_USED',
        'Cannot use a cancelled or refunded ticket'
      )
    }

    // Determine redemption location based on ticket_kind
    const redeemLocation = getTicketRedemptionLocation(ticket.ticket_kind)
    const redeemMethod = 'tap_tap_slide' // New redemption method
    
    // Update ticket: set used = true, used_at = now, used_method = 'tap_tap_slide', status = 'used'
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        used: true,
        used_at: now,
        used_method: redeemMethod,
        used_context: {
          auth_user_id: authUserId, // Unified identity in context
          used_at: now,
          method: redeemMethod,
          location: redeemLocation
        },
        status: 'used',
        redeemed_by_supabase_uid: authUserId  // Database field stores Supabase Auth UID
      })
      .eq('id', ticket_id)

    if (updateError) {
      logger.error('Failed to update ticket', { error: updateError, ticket_id })
      throw ErrorHandler.databaseError(updateError, 'UPDATE_FAILED')
    }

    // Create redemption log entry
    const { error: redemptionLogError } = await supabase
      .from('ticket_redemptions')
      .insert({
        ticket_id: ticket_id,
        supabase_uid: authUserId,  // Database field stores Supabase Auth UID
        redeemed_by_supabase_uid: authUserId,  // Operator is current user
        ticket_kind: ticket.ticket_kind,
        redeemed_at: now,
        redeem_source: 'customer_phone',
        redeem_location: redeemLocation,
        metadata: {
          method: redeemMethod,
          ticket_id: ticket_id,
          auth_user_id: authUserId // Unified identity in metadata
        }
      })

    if (redemptionLogError) {
      // Log error but don't fail the redemption (non-critical)
      logger.warn('Failed to create redemption log (non-critical)', { 
        error: redemptionLogError, 
        ticket_id 
      })
    } else {
      logger.info('Redemption log created', { ticket_id, redeemLocation })
    }

    logger.info('Ticket used successfully', { 
      ticket_id, 
      authUserId,
      used_at: now, 
      redeemLocation,
      ticket_kind: ticket.ticket_kind
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket has been used successfully',
      data: {
        ticket_id,
        used: true,
        used_at: now,
        used_method: redeemMethod,
        redeem_location: redeemLocation
      }
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

