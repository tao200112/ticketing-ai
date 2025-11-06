import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-activities-reorder-api')

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

    // Get current activity
    const { data: currentActivity, error: currentError } = await supabase
      .from('activities')
      .select('id, sort_order')
      .eq('id', id)
      .single()

    if (currentError || !currentActivity) {
      throw ErrorHandler.notFoundError(
        'ACTIVITY_NOT_FOUND',
        'Activity not found'
      )
    }

    // Get all activities ordered by sort_order
    const { data: allActivities, error: allError } = await supabase
      .from('activities')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })

    if (allError || !allActivities) {
      throw ErrorHandler.fromSupabaseError(allError || new Error('Failed to fetch activities'), 'QUERY_ERROR')
    }

    // Find current index
    const currentIndex = allActivities.findIndex(a => a.id === id)
    if (currentIndex === -1) {
      throw ErrorHandler.notFoundError(
        'ACTIVITY_NOT_FOUND',
        'Activity not found in list'
      )
    }

    // Calculate target index
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= allActivities.length) {
      // Cannot move further
      return NextResponse.json({
        success: true,
        message: 'Cannot move further'
      })
    }

    const target = allActivities[targetIndex]

    // Swap sort_order values
    const currentSortOrder = currentActivity.sort_order
    const targetSortOrder = target.sort_order

    // Update both activities
    const { error: updateCurrentError } = await supabase
      .from('activities')
      .update({ sort_order: targetSortOrder })
      .eq('id', id)

    if (updateCurrentError) {
      throw ErrorHandler.fromSupabaseError(updateCurrentError, 'UPDATE_ERROR')
    }

    const { error: updateTargetError } = await supabase
      .from('activities')
      .update({ sort_order: currentSortOrder })
      .eq('id', target.id)

    if (updateTargetError) {
      // Rollback
      await supabase
        .from('activities')
        .update({ sort_order: currentSortOrder })
        .eq('id', id)
      throw ErrorHandler.fromSupabaseError(updateTargetError, 'UPDATE_ERROR')
    }

    logger.success('Activity reordered successfully', { activityId: id, direction })

    return NextResponse.json({
      success: true,
      message: 'Activity reordered successfully'
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

