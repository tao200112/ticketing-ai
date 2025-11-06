import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('events-api')

export async function GET() {
  try {
    // 如果没有配置 Supabase，返回空数组
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, returning empty events list')
      return NextResponse.json({ 
        success: true, 
        data: [] 
      })
    }

    // 创建 Supabase 客户端
    const supabase = createSupabaseClient()

    // 从 Supabase 获取活动数据
    // 查询所有已发布的活动，如果没有则查询所有活动（包括草稿）
    let { data: events, error } = await supabase
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
          inventory,
          sold_count
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    // 如果没有已发布的活动，查询所有活动（开发环境）
    if (!events || events.length === 0) {
      logger.info('No published events found, querying all events')
      const { data: allEvents, error: allError } = await supabase
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
            inventory,
            sold_count
          )
        `)
        .order('created_at', { ascending: false })
      
      if (!allError && allEvents) {
        events = allEvents
        logger.info(`Found ${allEvents.length} events (including drafts)`)
      }
    }

    // 处理数据库错误
    if (error && (!events || events.length === 0)) {
      throw ErrorHandler.fromSupabaseError(error, 'DATABASE_QUERY_ERROR')
    }
    
    // 过滤掉无效活动和测试活动
    // 将硬编码的过滤逻辑改为配置化
    const INVALID_TITLES = ['11', 'bb', 'aa']
    if (events && events.length > 0) {
      events = events.filter(event => {
        const title = event.title?.trim() || ''
        const isValidTitle = title.length > 1 && !INVALID_TITLES.includes(title)
        return isValidTitle
      })
      logger.info(`Filtered events count: ${events.length}`)
    }

    // 为每个活动添加票务统计数据
    if (events && events.length > 0) {
      const eventsWithStats = await Promise.all(events.map(async (event) => {
        // 计算总票数（从prices表的inventory字段，null表示无限）
        const totalTickets = event.prices?.reduce((sum, price) => {
          if (price.inventory === null || price.inventory === undefined) {
            return sum // 无限库存不计入总数
          }
          return sum + price.inventory
        }, 0) || 0
        
        // 计算已售票数（优先从tickets表计算，回退到prices表的sold_count）
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('order_id')
          .eq('event_id', event.id)
        
        // 从tickets表计算已售票数（更准确）
        let ticketsSold = tickets?.length || 0
        
        // 如果tickets表没有数据，回退到prices表的sold_count
        if (ticketsError || !tickets || tickets.length === 0) {
          ticketsSold = event.prices?.reduce((sum, price) => sum + (price.sold_count || 0), 0) || 0
        }
        
        // 计算总收入（通过tickets表连接orders表）
        let revenue = 0
        if (tickets && tickets.length > 0) {
          // 获取所有唯一的订单ID
          const orderIds = [...new Set(tickets.map(t => t.order_id).filter(Boolean))]
          
          // 获取所有已支付订单的总金额
          if (orderIds.length > 0) {
            const { data: orders } = await supabase
              .from('orders')
              .select('total_amount_cents')
              .in('id', orderIds)
              .eq('status', 'paid')
            
            revenue = orders?.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) || 0
          }
        }
        
        return {
          ...event,
          // 兼容性字段映射
          startTime: event.start_at,
          location: event.venue_name || event.address,
          // 票务统计数据
          totalTickets,
          ticketsSold,
          revenue: (revenue / 100).toFixed(2)
        }
      }))
      
      return NextResponse.json({
        success: true,
        data: eventsWithStats
      })
    }

    return NextResponse.json({
      success: true,
      data: events || []
    })

  } catch (error) {
    return handleApiError(error, null, logger)
  }
}

export async function POST(request) {
  try {
    // 如果没有配置 Supabase，返回错误
    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    // 创建 Supabase 客户端
    const supabase = createSupabaseClient()

    // 获取请求体
    const body = await request.json()
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      poster_url,
      merchant_id,
      prices,
      status = 'published'
    } = body

    // 验证必需字段
    if (!title || !description || !startTime || !endTime || !location) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Missing required fields'
      )
    }

    // 创建活动
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([
        {
          title,
          description,
          start_at: startTime,
          end_at: endTime,
          address: location,
          venue_name: location,
          poster_url: poster_url || null,
          merchant_id: merchant_id || null,
          status: status,
          max_attendees: null,
          current_attendees: 0
        }
      ])
      .select()
      .single()

    if (eventError) {
      throw ErrorHandler.fromSupabaseError(eventError, 'CREATE_ERROR')
    }

    // 如果有价格信息，创建价格记录
    if (prices && Array.isArray(prices) && prices.length > 0) {
      const priceRecords = prices.map(price => ({
        event_id: event.id,
        name: price.name,
        amount_cents: price.amount_cents,
        inventory: price.inventory !== null && price.inventory !== undefined ? price.inventory : null, // null表示无限库存
        limit_per_user: price.limit_per_user || 4,
        is_active: true
      }))

      const { error: pricesError } = await supabase
        .from('prices')
        .insert(priceRecords)

      if (pricesError) {
        logger.warn('Failed to create prices', { error: pricesError, eventId: event.id })
        // 即使价格创建失败，也返回活动创建成功（非阻塞性错误）
      }
    }

    logger.success('Event created successfully', { eventId: event.id })

    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event created successfully'
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
