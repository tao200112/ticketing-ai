import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { ensureRegionId } from '@/lib/regions'

const logger = createLogger('admin-activities-detail-api')

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    const { data: activity, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'FETCH_ERROR')
    }

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      )
    }

    let regionData = null
    if (activity.region_id) {
      const { data: regionRecord } = await supabase
        .from('regions')
        .select('id, name, slug')
        .eq('id', activity.region_id)
        .maybeSingle()
      regionData = regionRecord || null
    }

    return NextResponse.json({
      success: true,
      data: {
        ...activity,
        region: regionData,
        region_slug: regionData?.slug || null
      }
    })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, image_url, text, is_active, region_slug, region_id: bodyRegionId } = body

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

    if (!title || title.trim() === '') {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Title is required'
      )
    }

    if (!region_slug && !bodyRegionId) {
      throw ErrorHandler.validationError(
        'MISSING_REGION',
        'Region selection is required'
      )
    }

    const supabase = createSupabaseClient()
    const resolvedRegionId = await ensureRegionId({
      regionId: bodyRegionId,
      regionSlug: region_slug,
      requireMatch: true
    })

    if (!resolvedRegionId) {
      throw ErrorHandler.validationError(
        'INVALID_REGION',
        'Region slug is invalid'
      )
    }

    const updateData = {
      title: title.trim(),
      text: text.trim(),
      ...(image_url !== undefined && { image_url: image_url || null }),
      ...(is_active !== undefined && { is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      region_id: resolvedRegionId
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

