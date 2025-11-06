import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-activities-detail-api')

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { image_url, text, is_active } = body

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    if (!text || text.trim() === '') {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Text is required'
      )
    }

    const supabase = createSupabaseClient()

    const updateData = {
      text: text.trim(),
      ...(image_url !== undefined && { image_url: image_url || null }),
      ...(is_active !== undefined && { is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order })
    }

    const { data: updatedActivity, error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'UPDATE_ERROR')
    }

    logger.success('Activity updated successfully', { activityId: id })

    return NextResponse.json({
      success: true,
      data: updatedActivity
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'DELETE_ERROR')
    }

    logger.success('Activity deleted successfully', { activityId: id })

    return NextResponse.json({
      success: true,
      message: 'Activity deleted successfully'
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

