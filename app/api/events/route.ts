// @ts-nocheck
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// 简单的内存缓存
let eventsCache: any[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30秒缓存

export async function GET() {
  try {
    // 检查缓存
    const now = Date.now()
    if (eventsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached events')
      return NextResponse.json(eventsCache)
    }

    // 检查Supabase配置
    if (!supabaseAdmin) {
      console.log('Supabase not configured, returning empty events')
      return NextResponse.json([])
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Events fetch error:', error)
      return NextResponse.json([])
    }

    console.log('Events fetched:', events?.length || 0, 'events')
    
    if (!events || events.length === 0) {
      console.log('No events found')
      return NextResponse.json([])
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

    return NextResponse.json(formattedEvents)
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json([])
  }
}
