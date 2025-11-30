import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-events-api')

export async function GET() {
  try {
    if (!supabaseAdmin) {
      throw ErrorHandler.configurationError(
        'CONFIGURATION_ERROR',
        'Supabase admin client not configured',
      )
    }

    const { data, error } = await supabaseAdmin.functions.invoke(
      'admin-actions',
      { body: { action: 'list_events' } },
    )

    if (error) {
      throw ErrorHandler.internalError(
        'EDGE_FUNCTION_ERROR',
        error.message || 'Failed to invoke admin-actions edge function',
      )
    }

    if (!data?.success) {
      throw ErrorHandler.internalError(
        'EDGE_FUNCTION_ERROR',
        data?.error || 'admin-actions returned an error',
      )
    }

    return NextResponse.json(data.data || [])
  } catch (error) {
    return handleApiError(error, null, logger)
  }
}
