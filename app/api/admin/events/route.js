import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('admin-events-api')

export async function GET() {
  try {
    // 如果没有配置 Supabase，返回空数组
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, returning empty array')
      return NextResponse.json([])
    }

    const supabase = createSupabaseClient()

    // 从 Supabase 获取所有活动
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        merchants (
          id,
          name,
          contact_email
        ),
        prices (
          id,
          name,
          amount_cents,
          inventory
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'DATABASE_QUERY_ERROR')
    }

    return NextResponse.json(events || [])
  } catch (error) {
    return handleApiError(error, null, logger)
  }
}
