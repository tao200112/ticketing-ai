import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { getTicketRedemptionLocation } from '@/lib/ticket-helpers'
import { getServerUser } from '@/lib/auth-server'

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

    // Get current user from Supabase Auth (supabase_uid)
    const authUser = await getServerUser()
    const supabaseUid = authUser?.id || null

    if (!supabaseUid) {
      throw ErrorHandler.unauthorizedError(
        'AUTHENTICATION_REQUIRED',
        'User must be logged in to redeem tickets'
      )
    }

    // 兼容旧代码：如果 body 中有 userId，也支持（但优先使用 supabaseUid）
    const { userId: bodyUserId } = body
    const userId = supabaseUid || bodyUserId

    if (!userId) {
      throw ErrorHandler.validationError(
        'MISSING_USER_ID',
        'User ID is required'
      )
    }

    logger.info('Ticket redemption request', { 
      ticket_id, 
      supabaseUid,
      bodyUserId,
      finalUserId: userId
    })

    // Fetch ticket (simplified query - avoid complex joins that might fail)
    // First, get ticket without order join to avoid potential RLS issues
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, supabase_uid, holder_email, status, used, used_at, order_id, event_id, ticket_kind')
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
        .select('customer_email, metadata, user_id, supabase_uid')
        .eq('id', ticket.order_id)
        .single()
      
      if (!orderError && order) {
        orderData = order
      } else {
        logger.warn('Order query failed (non-blocking)', { error: orderError, order_id: ticket.order_id })
      }
    }

    // Get user email from auth.users (Supabase Auth)
    const userEmail = authUser?.email || null

    // Verify ticket belongs to the user
    // 优先使用 supabase_uid 验证
    const ticketSupabaseUid = ticket.supabase_uid
    const orderSupabaseUid = orderData?.supabase_uid
    
    // 验证所有权：优先使用 supabase_uid，回退到旧字段
    const isOwner = 
      (ticketSupabaseUid && ticketSupabaseUid === supabaseUid) ||
      (orderSupabaseUid && orderSupabaseUid === supabaseUid) ||
      (ticket.holder_email && ticket.holder_email === userEmail) ||
      (orderData?.customer_email && orderData.customer_email === userEmail)
    
    logger.info('Ticket ownership check', {
      ticket_id,
      supabaseUid,
      ticketSupabaseUid,
      orderSupabaseUid,
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
          supabase_uid: supabaseUid,
          used_at: now,
          method: redeemMethod,
          location: redeemLocation
        },
        status: 'used',
        redeemed_by_supabase_uid: supabaseUid  // 记录核销操作人
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
        supabase_uid: supabaseUid,  // 使用 Supabase Auth UID
        redeemed_by_supabase_uid: supabaseUid,  // 操作人也是当前用户
        ticket_kind: ticket.ticket_kind,
        redeemed_at: now,
        redeem_source: 'customer_phone',
        redeem_location: redeemLocation,
        metadata: {
          method: redeemMethod,
          ticket_id: ticket_id,
          supabase_uid: supabaseUid
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
      supabaseUid,
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

