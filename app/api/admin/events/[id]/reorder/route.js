import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-events-reorder-api')

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { direction } = body // 'up' or 'down'

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    if (!direction || (direction !== 'up' && direction !== 'down')) {
      throw ErrorHandler.validationError(
        'INVALID_DIRECTION',
        'Direction must be "up" or "down"'
      )
    }

    const supabase = createSupabaseClient()

    // Get current event
    const { data: currentEvent, error: currentError } = await supabase
      .from('events')
      .select('id, sort_order')
      .eq('id', id)
      .single()

    if (currentError || !currentEvent) {
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found'
      )
    }

    // Get all events ordered by sort_order
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })

    if (allError || !allEvents) {
      throw ErrorHandler.fromSupabaseError(allError || new Error('Failed to fetch events'), 'QUERY_ERROR')
    }

    // Find current index
    const currentIndex = allEvents.findIndex(e => e.id === id)
    if (currentIndex === -1) {
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found in list'
      )
    }

    // Calculate target index
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= allEvents.length) {
      // Cannot move further
      return NextResponse.json({
        success: true,
        message: 'Cannot move further'
      })
    }

    const targetEvent = allEvents[targetIndex]

    // Swap sort_order values
    const currentSortOrder = currentEvent.sort_order
    const targetSortOrder = targetEvent.sort_order

    // Update both events
    const { error: updateCurrentError } = await supabase
      .from('events')
      .update({ sort_order: targetSortOrder })
      .eq('id', id)

    if (updateCurrentError) {
      throw ErrorHandler.fromSupabaseError(updateCurrentError, 'UPDATE_ERROR')
    }

    const { error: updateTargetError } = await supabase
      .from('events')
      .update({ sort_order: currentSortOrder })
      .eq('id', targetEvent.id)

    if (updateTargetError) {
      // Rollback
      await supabase
        .from('events')
        .update({ sort_order: currentSortOrder })
        .eq('id', id)
      throw ErrorHandler.fromSupabaseError(updateTargetError, 'UPDATE_ERROR')
    }

    logger.success('Event reordered successfully', { eventId: id, direction })

    return NextResponse.json({
      success: true,
      message: 'Event reordered successfully'
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

