import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

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

    // Get user session from request headers (client should send user ID)
    // For now, we'll get it from the body, but in production you should use proper auth
    const { userId } = body

    if (!userId) {
      throw ErrorHandler.validationError(
        'MISSING_USER_ID',
        'User ID is required'
      )
    }

    // Fetch ticket (simplified query - avoid complex joins that might fail)
    // First, get ticket without order join to avoid potential RLS issues
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, user_id, holder_email, status, used, used_at, order_id, event_id')
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
        .select('customer_email, metadata, user_id')
        .eq('id', ticket.order_id)
        .single()
      
      if (!orderError && order) {
        orderData = order
      } else {
        logger.warn('Order query failed (non-blocking)', { error: orderError, order_id: ticket.order_id })
      }
    }

    // Get user email from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      logger.error('User query error', { error: userError, userId })
      throw ErrorHandler.unauthorizedError(
        'USER_NOT_FOUND',
        'User not found'
      )
    }

    // Verify ticket belongs to the user
    // Handle metadata as JSONB or string, and check order.user_id field
    let orderUserId = null
    
    // First check order.user_id field directly (if exists)
    if (orderData?.user_id) {
      orderUserId = orderData.user_id
    }
    
    // Then check metadata (if user_id not found in order.user_id)
    if (!orderUserId && orderData?.metadata) {
      if (typeof orderData.metadata === 'string') {
        try {
          const parsed = JSON.parse(orderData.metadata)
          orderUserId = parsed.user_id
        } catch (e) {
          logger.warn('Failed to parse order metadata', { error: e })
        }
      } else if (typeof orderData.metadata === 'object') {
        orderUserId = orderData.metadata.user_id
      }
    }
    
    const orderEmail = orderData?.customer_email
    const ticketUserId = ticket.user_id
    const ticketHolderEmail = ticket.holder_email

    // Verify ownership: check user_id from ticket, order user_id, order metadata, email match, or holder_email match
    const isOwner = 
      (ticketUserId && ticketUserId === userId) ||
      (orderUserId && orderUserId === userId) ||
      (orderEmail && orderEmail === userData.email) ||
      (ticketHolderEmail && ticketHolderEmail === userData.email)
    
    logger.info('Ticket ownership check', {
      ticket_id,
      userId,
      ticketUserId,
      orderUserId,
      ticketHolderEmail,
      orderEmail,
      userEmail: userData.email,
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

    // Update ticket: set used = true, used_at = now, used_method = 'triple_click', status = 'used'
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        used: true,
        used_at: now,
        used_method: 'triple_click',
        used_context: {
          user_id: userId,
          used_at: now,
          method: 'triple_click'
        },
        status: 'used'
      })
      .eq('id', ticket_id)

    if (updateError) {
      logger.error('Failed to update ticket', { error: updateError, ticket_id })
      throw ErrorHandler.databaseError(updateError, 'UPDATE_FAILED')
    }

    logger.info('Ticket used successfully', { ticket_id, userId, used_at: now })

    return NextResponse.json({
      success: true,
      message: 'Ticket has been used successfully',
      data: {
        ticket_id,
        used: true,
        used_at: now,
        used_method: 'triple_click'
      }
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

