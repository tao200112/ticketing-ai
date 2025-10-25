import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-id'

const logger = createLogger('health/events/[slug]')

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  try {
    const { slug } = await params
    logger.start({ requestId, fn: 'health/events/[slug]', slug })
    
    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Missing Supabase environment variables', { requestId })
      return NextResponse.json({
        ok: false,
        code: 'CONFIG_ERROR',
        message: 'Database not configured',
        slug,
        exists: false,
        status: null,
        pricesCount: 0
      })
    }
    
    // 使用 RLS 客户端（非 Service Role）
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 查询事件
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, slug, status')
      .eq('slug', slug)
      .single()
    
    if (eventError) {
      logger.warn('Event query failed', { 
        requestId, 
        slug, 
        supabaseError: eventError.message 
      })
      return NextResponse.json({
        ok: false,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        slug,
        exists: false,
        status: null,
        pricesCount: 0
      })
    }
    
    if (!event) {
      logger.info('Event not found', { requestId, slug })
      return NextResponse.json({
        ok: false,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        slug,
        exists: false,
        status: null,
        pricesCount: 0
      })
    }
    
    // 查询价格
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select('id, name, amount_cents, is_active')
      .eq('event_id', event.id)
      .eq('is_active', true)
    
    if (pricesError) {
      logger.warn('Prices query failed', { 
        requestId, 
        eventId: event.id,
        supabaseError: pricesError.message 
      })
      return NextResponse.json({
        ok: true,
        code: 'EVENT_FOUND',
        message: 'Event found but prices query failed',
        slug,
        exists: true,
        status: event.status,
        pricesCount: 0
      })
    }
    
    const pricesCount = prices?.length || 0
    
    logger.success('Event health check completed', {
      requestId,
      slug,
      eventId: event.id,
      status: event.status,
      pricesCount,
      duration_ms: Date.now() - startTime
    })
    
    return NextResponse.json({
      ok: true,
      code: 'OK',
      message: 'Event accessible',
      slug,
      exists: true,
      status: event.status,
      pricesCount
    })
    
  } catch (error) {
    logger.error('Health check failed', error, {
      requestId,
      duration_ms: Date.now() - startTime,
      needs_attention: true
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      slug: 'unknown',
      exists: false,
      status: null,
      pricesCount: 0
    }, { status: 500 })
  }
}
