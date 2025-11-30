import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { ensureRegionId } from '@/lib/regions'
import { ensureMerchantRegion } from '@/lib/db/ensureMerchantRegion'

const logger = createLogger('events-api')

export async function GET(request) {
  try {
    // 如果没有配置 Supabase，返回空数组
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, returning empty events list')
      return NextResponse.json({ 
        success: true, 
        data: [] 
      })
    }

    const supabase = createSupabaseClient()
    const url = new URL(request.url)
    const regionSlugParam = url.searchParams.get('region')?.toString().trim().toLowerCase() || null
    let regionFilterId = null

    if (regionSlugParam) {
      const { data: regionRecord, error: regionError } = await supabase
        .from('regions')
        .select('id')
        .eq('slug', regionSlugParam)
        .eq('is_active', true)
        .maybeSingle()

      if (regionError) {
        logger.error('Failed to resolve region slug', { regionSlug: regionSlugParam, error: regionError })
        return NextResponse.json(
          { success: false, error: 'Failed to resolve region' },
          { status: 500 }
        )
      }

      if (!regionRecord) {
        logger.info('Region slug not found, returning empty events', { regionSlug: regionSlugParam })
        return NextResponse.json({ success: true, data: [] })
      }

      regionFilterId = regionRecord.id
    }

    // 从 Supabase 获取活动数据
    // 首先查询所有活动，然后在前端过滤（这样可以处理 status 字段可能为 null 的情况）
    const baseSelect = `
      *,
      merchants (
        id,
        name,
        email
      ),
      prices (
        id,
        name,
        amount_cents,
        inventory,
        sold_count
      )
    `

    const buildEventQuery = (publishedOnly = false) => {
      let query = supabase
        .from('events')
        .select(baseSelect)
        .order('start_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (publishedOnly) {
        query = query.eq('status', 'published')
      }

      if (regionSlugParam) {
        const regionFilters = [`region.eq.${regionSlugParam}`]
        if (regionFilterId) {
          regionFilters.push(`region_id.eq.${regionFilterId}`)
        }
        query = query.or(regionFilters.join(','))
      } else if (regionFilterId) {
        query = query.eq('region_id', regionFilterId)
      }

      return query
    }

    let { data: events, error } = await buildEventQuery(false)

    const shouldAttemptFallback =
      !regionFilterId && (!events || events.length === 0 || Boolean(error))

    if (shouldAttemptFallback) {
      logger.info('Primary events query empty, attempting published-only fallback')
      const { data: publishedEvents, error: publishedError } = await buildEventQuery(true)
      
      if (!publishedError && publishedEvents) {
        events = publishedEvents
        error = null
        logger.info(`Found ${publishedEvents.length} published events in fallback query`)
      } else if (publishedError) {
        logger.warn('Error querying published events', { error: publishedError })
        if (!error) {
          error = publishedError
        }
      }
    } else if (events && events.length > 0) {
      // 如果查询成功，过滤出已发布的活动（如果 status 字段存在）
      // 如果 status 为 null 或 undefined，也视为已发布（兼容旧数据）
      const publishedEvents = events.filter(event => {
        const status = event.status
        return status === 'published' || status === null || status === undefined
      })
      if (publishedEvents.length > 0 && publishedEvents.length !== events.length) {
        events = publishedEvents
        logger.info(`Filtered to ${publishedEvents.length} published/active events from ${events.length} total`)
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

    // 验证商家身份（如果提供了merchant_id）
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
      status = 'published',
      region_id: bodyRegionId,
      region_slug: regionSlug,
    } = body

    let merchantRegionId = null
    let merchantRegionSlug = null

    // 如果提供了merchant_id，验证当前用户是否有权限为该商家创建活动
    if (merchant_id) {
      try {
        const { getSupabaseUser } = await import('@/lib/supabase/server')
        const user = await getSupabaseUser()

        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('id, owner_supabase_uid, email, region_id, region')
          .eq('id', merchant_id)
          .maybeSingle()

        if (merchantError) {
          logger.warn('Error checking merchant ownership', { error: merchantError, merchant_id })
        } else if (merchant) {
          merchantRegionId = merchant.region_id
          merchantRegionSlug = merchant.region || null

          if (user) {
            // 验证所有权：通过 owner_supabase_uid 或 email
            const isOwner = merchant.owner_supabase_uid === user.id ||
                           merchant.email?.toLowerCase() === user.email?.toLowerCase()

            if (!isOwner) {
              throw ErrorHandler.authenticationError(
                'UNAUTHORIZED',
                'You do not have permission to create events for this merchant'
              )
            }
            logger.info('Merchant ownership verified', {
              merchant_id,
              userId: user.id,
            })
          }
        }
      } catch (authError) {
        // 如果认证检查失败，记录但不阻止（允许管理员创建活动）
        logger.warn('Merchant authentication check failed', { 
          error: authError.message,
          merchant_id 
        })
      }
    }

    // 验证必需字段
    if (!title || !description || !startTime || !endTime || !location) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Missing required fields'
      )
    }

    let resolvedRegionId = null
    let resolvedRegionSlug = null

    if (merchant_id) {
      // 如果 merchant 没有 region_id，尝试自动修复
      if (!merchantRegionId) {
        logger.warn('Merchant missing region_id, attempting to auto-patch', { merchant_id })
        
        // 尝试自动修复
        const patchedRegionId = await ensureMerchantRegion(merchant_id)
        
        if (patchedRegionId) {
          // 修复成功，重新查询 merchant 获取 region 信息
          const { data: updatedMerchant } = await supabase
            .from('merchants')
            .select('id, region_id, region')
            .eq('id', merchant_id)
            .maybeSingle()
          
          if (updatedMerchant) {
            merchantRegionId = updatedMerchant.region_id
            merchantRegionSlug = updatedMerchant.region || null
            logger.info('Successfully auto-patched merchant region', {
              merchant_id,
              regionId: patchedRegionId
            })
          }
        }
        
        // 如果修复后仍然没有 region_id，返回错误
        if (!merchantRegionId) {
          throw ErrorHandler.validationError(
            'INVALID_MERCHANT_REGION',
            'Merchant has no region and automatic patching failed.'
          )
        }
      }
      
      resolvedRegionId = merchantRegionId
      resolvedRegionSlug = merchantRegionSlug
    } else {
      resolvedRegionId = await ensureRegionId({ regionId: bodyRegionId, regionSlug })
      resolvedRegionSlug = regionSlug || null
    }

    if (!resolvedRegionId) {
      throw ErrorHandler.validationError(
        'INVALID_REGION',
        'Region is required'
      )
    }

    if (resolvedRegionId && !resolvedRegionSlug) {
      const { data: regionRecord } = await supabase
        .from('regions')
        .select('slug')
        .eq('id', resolvedRegionId)
        .maybeSingle()
      resolvedRegionSlug = regionRecord?.slug || null
    }

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
          current_attendees: 0,
          region_id: resolvedRegionId,
          region: resolvedRegionSlug || 'Unknown'
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
        is_active: true,
        ticket_kind: price.ticket_kind || null // Store ticket_kind in prices table metadata or as a separate field if needed
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