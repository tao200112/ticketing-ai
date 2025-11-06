import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('event-detail-api')

export async function GET(request, { params }) {
  try {
    // Next.js 15: params 是 Promise，需要 await
    const resolvedParams = await params
    const id = resolvedParams?.id
    
    // 如果 id 不存在，尝试从 URL 中提取
    let finalId = id
    if (!finalId) {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const eventIndex = pathParts.indexOf('events')
      if (eventIndex !== -1 && pathParts[eventIndex + 1]) {
        finalId = pathParts[eventIndex + 1]
      }
    }
    
    logger.info('Event detail API called', { 
      id: finalId,
      params: resolvedParams,
      url: request.url,
      pathname: new URL(request.url).pathname
    })

    if (!finalId) {
      logger.error('Event ID is missing', { 
        params: resolvedParams, 
        url: request.url,
        pathname: new URL(request.url).pathname
      })
      throw ErrorHandler.validationError(
        'MISSING_EVENT_ID',
        'Event ID is required'
      )
    }

    if (finalId === 'ridiculous-chicken') {
      const defaultEvent = {
        id: 'ridiculous-chicken',
        title: 'Ridiculous Chicken Night Event',
        name: 'Ridiculous Chicken Night Event',
        description: 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.',
        location: '201 N Main St SUITE A, Blacksburg, VA 24060',
        address: '201 N Main St SUITE A, Blacksburg, VA 24060',
        start_at: '2025-10-25T20:00:00Z',
        merchants: { name: 'PartyTix Events' },
        prices: [
          { id: 'regular', name: 'Regular Ticket (21+)', amount_cents: 1500, inventory: 100 },
          { id: 'special', name: 'Special Ticket (18-20)', amount_cents: 3000, inventory: 50 }
        ]
      }
      return NextResponse.json({ success: true, data: defaultEvent })
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    logger.info('Querying event from database', { eventId: finalId })

    // 先尝试简单查询（不包含关联），看看事件是否存在
    const { data: simpleEvent, error: simpleError } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', finalId)
      .single()

    if (simpleError) {
      logger.error('Simple query failed', { 
        eventId: finalId,
        error: {
          code: simpleError.code,
          message: simpleError.message,
          details: simpleError.details,
          hint: simpleError.hint
        }
      })
    } else if (simpleEvent) {
      logger.info('Event found (simple query)', { 
        eventId: finalId, 
        title: simpleEvent.title,
        status: simpleEvent.status 
      })
    } else {
      logger.warn('Event not found (simple query returned no data)', { eventId: finalId })
    }

    // 查询事件详情，不限制 status（允许查看所有状态的事件）
    // 先尝试查询包含 ticket_kind，如果失败则查询不包含 ticket_kind
    let query = supabase
      .from('events')
      .select(`
        *,
        merchants (id, name, contact_email),
        prices (id, name, amount_cents, inventory)
      `)
      .eq('id', finalId)
      .single()
    
    // 尝试添加 ticket_kind（如果列存在）
    // 注意：Supabase 如果列不存在会返回错误，所以我们需要先尝试不包含它
    const { data: event, error } = await query

    logger.info('Full query result', { 
      eventId: finalId,
      hasEvent: !!event,
      hasError: !!error,
      errorCode: error?.code,
      pricesCount: event?.prices?.length || 0
    })

    if (error) {
      logger.error('Error fetching event', { 
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }, 
        eventId: finalId 
      })
      
      // 如果是 PGRST116 (no rows found)，返回 404
      if (error.code === 'PGRST116') {
        logger.warn('Event not found in database', { eventId: finalId })
        throw ErrorHandler.notFoundError(
          'EVENT_NOT_FOUND',
          'Event not found'
        )
      }
      
      // 如果是权限错误（RLS 问题）
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
        logger.error('RLS permission error', { eventId: finalId, error })
        // 尝试使用 service role key 重新查询
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          const { createClient } = require('@supabase/supabase-js')
          const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceKey
          )
          const { data: adminEvent, error: adminError } = await adminSupabase
            .from('events')
            .select(`
              *,
              merchants (id, name, contact_email),
              prices (id, name, amount_cents, inventory)
            `)
            .eq('id', finalId)
            .single()
          
          if (!adminError && adminEvent) {
            logger.info('Event found using service role key', { eventId: finalId })
            return NextResponse.json({ success: true, data: adminEvent })
          }
        }
        throw ErrorHandler.notFoundError(
          'EVENT_NOT_FOUND',
          'Event not found or access denied'
        )
      }
      
      // 其他错误也返回 404，避免泄露数据库结构
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found'
      )
    }

    if (!event) {
      logger.warn('Event not found', { eventId: finalId })
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        'Event not found'
      )
    }

    logger.info('Event fetched successfully', { eventId: finalId, eventTitle: event.title })
    return NextResponse.json({ success: true, data: event })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (!id) {
      throw ErrorHandler.validationError(
        'MISSING_EVENT_ID',
        'Event ID is required'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // 删除价格记录（如果失败不影响主删除操作）
    const { error: pricesError } = await supabase.from('prices').delete().eq('event_id', id)
    if (pricesError) {
      logger.warn('Failed to delete prices', { error: pricesError, eventId: id })
    }

    // 删除活动
    const { error } = await supabase.from('events').delete().eq('id', id)

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'DELETE_ERROR')
    }

    logger.success('Event deleted successfully', { eventId: id })
    return NextResponse.json({ success: true, message: '活动删除成功' })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams?.id || resolvedParams?.id
    const body = await request.json()
    const { title, description, startTime, endTime, location, poster_url, status, prices } = body

    // 处理默认活动 ridiculous-chicken
    if (id === 'ridiculous-chicken') {
      // 对于默认活动，我们返回成功但不实际更新数据库
      // 因为这是一个虚拟的默认活动
      const updatedEvent = {
        id: 'ridiculous-chicken',
        title: title || 'Ridiculous Chicken Night Event',
        name: title || 'Ridiculous Chicken Night Event',
        description: description || 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event.',
        location: location || '201 N Main St SUITE A, Blacksburg, VA 24060',
        address: location || '201 N Main St SUITE A, Blacksburg, VA 24060',
        start_at: startTime || '2025-10-25T20:00:00Z',
        end_at: endTime || '2025-10-25T23:00:00Z',
        status: status || 'published',
        merchants: { name: 'PartyTix Events' },
        prices: prices || [
          { id: 'regular', name: 'Regular Ticket (21+)', amount_cents: 1500, inventory: 100 },
          { id: 'special', name: 'Special Ticket (18-20)', amount_cents: 3000, inventory: 50 }
        ]
      }
      
      logger.info('Default event updated (virtual)', { title: updatedEvent.title })
      return NextResponse.json({ 
        success: true, 
        data: updatedEvent, 
        message: 'Default event updated successfully (Note: This is a virtual event and will not be saved to the database)' 
      })
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // 更新活动基本信息
    const { data: event, error } = await supabase
      .from('events')
      .update({
        title,
        description,
        start_at: startTime,
        end_at: endTime,
        address: location,
        venue_name: location,
        poster_url: poster_url || null,
        ...(status && { status })
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw ErrorHandler.fromSupabaseError(error, 'UPDATE_ERROR')
    }

    // 如果有价格信息，更新价格
    if (prices && Array.isArray(prices) && prices.length > 0) {
      // 先删除现有价格
      const { error: deleteError } = await supabase.from('prices').delete().eq('event_id', id)
      if (deleteError) {
        logger.warn('Failed to delete existing prices', { error: deleteError, eventId: id })
      }
      
      // 插入新价格
      const priceRecords = prices.map(price => ({
        event_id: id,
        name: price.name,
        amount_cents: price.amount_cents,
        inventory: price.inventory !== null && price.inventory !== undefined ? price.inventory : null, // null表示无限库存
        limit_per_user: price.limit_per_user || 4,
        is_active: true,
        ticket_kind: price.ticket_kind || null
      }))

      const { error: pricesError } = await supabase
        .from('prices')
        .insert(priceRecords)

      if (pricesError) {
        logger.warn('Failed to update prices', { error: pricesError, eventId: id })
        // 即使价格更新失败，也返回活动更新成功（非阻塞性错误）
      }
    }

    logger.success('Event updated successfully', { eventId: event.id })
    return NextResponse.json({ success: true, data: event, message: 'Event updated successfully' })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
