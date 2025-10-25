import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-id'

const logger = createLogger('compat/uuid-to-slug')

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  try {
    logger.start({ requestId, fn: 'uuid-to-slug' })
    
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      logger.warn('Missing id parameter', { requestId })
      return NextResponse.rewrite('/404')
    }
    
    logger.info(`Looking up event by ID: ${id}`, { requestId, eventId: id })
    
    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      logger.error('Supabase admin not available', { requestId })
      return NextResponse.rewrite('/404')
    }
    
    // 查询事件
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('id, title, slug, status')
      .eq('id', id)
      .eq('status', 'published')
      .single()
    
    if (error) {
      logger.error('Event query failed', error, { requestId, eventId: id, supabaseError: error.message })
      return NextResponse.rewrite('/404')
    }
    
    if (!event) {
      logger.info('Event not found or not published', { requestId, eventId: id })
      return NextResponse.rewrite('/404')
    }
    
    // 生成 slug（如果没有 slug 字段，使用 title 生成）
    let slug = (event as any).slug
    if (!slug) {
      slug = (event as any).title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }
    
    logger.success(`Redirecting to /event/${slug}`, {
      requestId,
      eventId: id,
      slug,
      duration_ms: Date.now() - startTime
    })
    
    return NextResponse.redirect(`/event/${slug}`, 308)
    
  } catch (error) {
    logger.error('UUID to slug conversion failed', error, {
      requestId,
      duration_ms: Date.now() - startTime,
      needs_attention: true
    })
    return NextResponse.rewrite('/404')
  }
}
