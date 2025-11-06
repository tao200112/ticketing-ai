import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'

/**
 * 诊断 API - 帮助排查事件详情页 404 问题
 * 访问: /api/events/[id]/debug
 */
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    let id = resolvedParams?.id
    
    // 如果 id 不存在，尝试从 URL 中提取
    if (!id) {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const eventIndex = pathParts.indexOf('events')
      if (eventIndex !== -1 && pathParts[eventIndex + 1]) {
        id = pathParts[eventIndex + 1]
      }
    }
    
    const result = {
      eventId: id,
      timestamp: new Date().toISOString(),
      checks: {}
    }

    // 1. 检查 Supabase 配置
    result.checks.supabaseConfigured = isSupabaseConfigured()
    
    if (!result.checks.supabaseConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Supabase is not configured',
        result
      }, { status: 500 })
    }

    const supabase = createSupabaseClient()
    const { supabaseUrl, supabaseKey } = require('@/lib/supabase-api').getSupabaseConfig()
    
    result.checks.supabaseUrl = supabaseUrl ? 'configured' : 'missing'
    result.checks.supabaseKey = supabaseKey ? 'configured' : 'missing'

    // 2. 尝试查询事件（不带关联查询）
    const { data: eventSimple, error: errorSimple } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', id)
      .single()

    result.checks.simpleQuery = {
      success: !errorSimple && eventSimple,
      error: errorSimple ? {
        code: errorSimple.code,
        message: errorSimple.message,
        details: errorSimple.details
      } : null,
      data: eventSimple
    }

    // 3. 尝试查询事件（带关联查询）
    const { data: eventWithRelations, error: errorRelations } = await supabase
      .from('events')
      .select(`
        *,
        merchants (id, name, contact_email),
        prices (id, name, amount_cents, inventory)
      `)
      .eq('id', id)
      .single()

    result.checks.relationQuery = {
      success: !errorRelations && eventWithRelations,
      error: errorRelations ? {
        code: errorRelations.code,
        message: errorRelations.message,
        details: errorRelations.details
      } : null,
      hasData: !!eventWithRelations
    }

    // 4. 检查是否有其他事件存在
    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('id, title, status')
      .limit(5)

    result.checks.otherEvents = {
      count: allEvents?.length || 0,
      sample: allEvents?.slice(0, 3) || [],
      error: allEventsError ? {
        code: allEventsError.code,
        message: allEventsError.message
      } : null
    }

    // 5. 检查 prices 表
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select('id, event_id, name')
      .eq('event_id', id)
      .limit(5)

    result.checks.prices = {
      count: prices?.length || 0,
      sample: prices || [],
      error: pricesError ? {
        code: pricesError.code,
        message: pricesError.message
      } : null
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        eventExists: !!eventSimple,
        eventAccessible: !errorSimple,
        hasRelations: !!eventWithRelations,
        totalEventsInDB: allEvents?.length || 0,
        pricesForEvent: prices?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

