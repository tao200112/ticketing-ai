import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-activities-api')

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([])
    }

    const supabase = createSupabaseClient()

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching activities:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(activities || [])

  } catch (error) {
    return handleApiError(error, null, logger)
  }
}

export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const body = await request.json()
    const { title, image_url, text, is_active = true } = body

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

    const supabase = createSupabaseClient()

    // Get max sort_order to set new activity at the end
    // Handle case where sort_order column might not exist yet
    let maxSortOrder = 999999
    try {
      const { data: existingActivities, error: sortError } = await supabase
        .from('activities')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      // If sort_order column doesn't exist, just use default
      if (!sortError && existingActivities && existingActivities.length > 0) {
        maxSortOrder = (existingActivities[0].sort_order || 999999) + 1
      }
    } catch (sortErr) {
      // If sort_order column doesn't exist, use default value
      logger.warn('sort_order column may not exist, using default', sortErr)
      maxSortOrder = 999999
    }

    // Build insert data - only include sort_order if column exists
    const insertData = {
      title: title.trim(),
      image_url: image_url || null,
      text: text.trim(),
      is_active: is_active
    }

    // Try to add sort_order, but don't fail if column doesn't exist
    // The migration should add it, but we handle gracefully if not
    try {
      insertData.sort_order = maxSortOrder
    } catch (e) {
      // Ignore if sort_order can't be added
    }

    const { data: newActivity, error } = await supabase
      .from('activities')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create activity:', error)
      throw ErrorHandler.fromSupabaseError(error, 'CREATION_ERROR')
    }

    logger.success('Activity created successfully', { activityId: newActivity.id })

    return NextResponse.json({
      success: true,
      data: newActivity
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

