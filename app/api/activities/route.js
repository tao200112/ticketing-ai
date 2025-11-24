import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('activities-api')

export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const supabase = createSupabaseClient()
    const url = new URL(request.url)
    const regionSlug = url.searchParams.get('region')?.toString().trim().toLowerCase() || null
    let regionFilterId = null

    if (regionSlug) {
      const { data: regionRecord, error: regionError } = await supabase
        .from('regions')
        .select('id')
        .eq('slug', regionSlug)
        .eq('is_active', true)
        .maybeSingle()

      if (regionError) {
        logger.error('[activities-api] Failed to resolve region slug', { regionSlug, error: regionError })
        return NextResponse.json(
          { success: false, error: 'Failed to resolve region' },
          { status: 500 }
        )
      }

      if (!regionRecord) {
        logger.info('[activities-api] Region slug not found, returning empty list', { regionSlug })
        return NextResponse.json({ success: true, data: [] })
      }

      regionFilterId = regionRecord.id
    }

    let query = supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (regionFilterId) {
      query = query.eq('region_id', regionFilterId)
    }

    const { data: activities, error } = await query

    if (error) {
      logger.error('Error fetching activities:', error)
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    return NextResponse.json({
      success: true,
      data: activities || []
    })

  } catch (error) {
    return handleApiError(error, null, logger)
  }
}

