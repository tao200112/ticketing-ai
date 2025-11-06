import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('activities-api')

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const supabase = createSupabaseClient()

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

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

