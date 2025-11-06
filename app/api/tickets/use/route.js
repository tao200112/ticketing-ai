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

    // Fetch ticket and verify ownership
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, orders!inner(customer_email, metadata)')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      throw ErrorHandler.notFoundError(
        'TICKET_NOT_FOUND',
        'Ticket not found'
      )
    }

    // Verify ticket belongs to the user
    // Check if user_id matches from order metadata or customer_email matches user's email
    const orderUserId = ticket.orders?.metadata?.user_id
    const orderEmail = ticket.orders?.customer_email

    // Get user email from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw ErrorHandler.unauthorizedError(
        'USER_NOT_FOUND',
        'User not found'
      )
    }

    // Verify ownership: check user_id from order metadata OR email match
    const isOwner = 
      (orderUserId && orderUserId === userId) ||
      (orderEmail && orderEmail === userData.email) ||
      (ticket.holder_email === userData.email)

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

