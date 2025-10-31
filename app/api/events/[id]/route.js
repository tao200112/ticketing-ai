import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('event-detail-api')

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (id === 'ridiculous-chicken') {
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

    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        merchants (id, name, contact_email),
        prices (id, name, amount_cents, inventory)
      `)
      .eq('id', id)
      .single()

    if (error || !event) {
      throw ErrorHandler.notFoundError(
        'EVENT_NOT_FOUND',
        '活动不存在'
      )
    }

    return NextResponse.json({ success: true, data: event })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

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
    const { id } = await params
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
        message: '默认活动更新成功（注意：这是虚拟活动，不会保存到数据库）' 
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
        status: status
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
        inventory: price.inventory || 0,
        limit_per_user: price.limit_per_user || 4,
        is_active: true
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
    return NextResponse.json({ success: true, data: event, message: '活动更新成功' })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
