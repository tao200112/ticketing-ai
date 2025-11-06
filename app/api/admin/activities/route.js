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
    const { image_url, text, is_active = true } = body

    if (!text || text.trim() === '') {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Text is required'
      )
    }

    const supabase = createSupabaseClient()

    const { data: newActivity, error } = await supabase
      .from('activities')
      .insert({
        image_url: image_url || null,
        text: text.trim(),
        is_active: is_active
      })
      .select()
      .single()

    if (error) {
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

