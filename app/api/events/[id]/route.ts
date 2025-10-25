import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { validateEventDetail } from '../../../../lib/schemas/event'

export const dynamic = 'force-dynamic'

/**
 * 获取单个事件详情
 * GET /api/events/[id]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      console.warn('Supabase not configured, returning empty event')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    // 查询事件详情，包含价格信息
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        venue_name,
        address,
        max_attendees,
        poster_url,
        status,
        created_at,
        updated_at,
        prices (
          id,
          name,
          description,
          amount_cents,
          currency,
          inventory,
          limit_per_user
        )
      `)
      .eq('id', id)
      .eq('status', 'published') // 只返回已发布的事件
      .single()

    if (error) {
      console.error('Event fetch error:', error)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // 转换数据格式以匹配 Zod 模型
    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_at,
      end_time: event.end_at,
      venue: event.venue_name,
      location: event.address,
      max_attendees: event.max_attendees,
      poster_url: event.poster_url,
      status: event.status,
      created_at: event.created_at,
      updated_at: event.updated_at,
      prices: event.prices?.map((price: any) => ({
        id: price.id,
        label: price.name,
        amount: price.amount_cents,
        currency: price.currency || 'USD',
        inventory: price.inventory,
        limit_per_user: price.limit_per_user
      })) || []
    }

    // 使用 Zod 验证数据
    const validatedEvent = validateEventDetail(formattedEvent)
    
    if (!validatedEvent) {
      console.error('Event data validation failed for event:', id)
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 500 }
      )
    }

    console.log(`[EventDetail] Successfully fetched event ${id}`)
    
    return NextResponse.json({
      success: true,
      event: validatedEvent
    })

  } catch (error) {
    console.error('[EventDetail] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
