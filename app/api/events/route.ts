// @ts-nocheck
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-id'

const logger = createLogger('events')
export const dynamic = 'force-dynamic'

// 简单的内存缓存
let eventsCache: any[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30秒缓存

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  try {
    logger.start({ requestId, fn: 'events' })
    
    // 检查缓存
    const now = Date.now()
    if (eventsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      logger.info('Returning cached events', { requestId })
      return NextResponse.json({ ok: true, events: eventsCache })
    }

    // 检查Supabase配置
    if (!supabaseAdmin) {
      logger.warn('Supabase not configured', { requestId })
      return NextResponse.json({ 
        ok: false, 
        code: 'CONFIG_ERROR', 
        message: 'Database not configured',
        events: []
      })
    }

    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        merchants (
          id,
          name,
          contact_email
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Events fetch error', error, { 
        requestId, 
        supabaseError: error.message 
      })
      return NextResponse.json({ 
        ok: false, 
        code: 'DB_ERROR', 
        message: 'Failed to fetch events',
        events: []
      })
    }

    logger.info(`Events fetched: ${events?.length || 0} events`, { requestId })
    
    if (!events || events.length === 0) {
      logger.info('No events found', { requestId })
      return NextResponse.json({ ok: true, events: [] })
    }

    // 转换数据格式以匹配前端期望的格式
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.title,
      description: event.description,
      start_date: event.start_at,
      end_date: event.end_at,
      location: event.venue_name,
      max_attendees: event.max_attendees,
      poster_url: event.poster_url,
      merchant: event.merchants,
      created_at: event.created_at
    }))

    // 更新缓存
    eventsCache = formattedEvents
    cacheTimestamp = now

    logger.success('Events retrieved successfully', {
      requestId,
      eventCount: formattedEvents.length,
      duration_ms: Date.now() - startTime
    })

    return NextResponse.json({ ok: true, events: formattedEvents })
  } catch (error) {
    logger.error('Events API error', error, {
      requestId,
      duration_ms: Date.now() - startTime,
      needs_attention: true
    })
    return NextResponse.json({ 
      ok: false, 
      code: 'INTERNAL_ERROR', 
      message: 'Internal server error',
      events: []
    }, { status: 500 })
  }
}
