import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    // 如果没有配置 Supabase，返回空数组
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase 未配置，返回空活动列表')
      return NextResponse.json({ 
        success: true, 
        data: [] 
      })
    }

    // 创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseKey)

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
          inventory
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    // 如果没有已发布的活动，查询所有活动（开发环境）
    if (!events || events.length === 0) {
      console.log('⚠️ 没有已发布的活动，查询所有活动')
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
            inventory
          )
        `)
        .order('created_at', { ascending: false })
      
      if (!allError && allEvents) {
        events = allEvents
        console.log(`✅ 找到 ${allEvents.length} 个活动（包括草稿）`)
      }
    }

    // 只处理第一次查询的错误
    if (error && (!events || events.length === 0)) {
      console.error('❌ 获取活动失败:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'DATABASE_ERROR',
          message: '获取活动数据失败' 
        },
        { status: 500 }
      )
    }
    
    // 过滤掉空活动和测试活动
    if (events && events.length > 0) {
      events = events.filter(event => {
        const title = event.title?.trim() || ''
        const isValidTitle = title.length > 1 && title !== '11' && title !== 'bb' && title !== 'aa'
        return isValidTitle
      })
      console.log(`✅ 过滤后活动数量: ${events.length}`)
    }

    return NextResponse.json({
      success: true,
      data: events || []
    })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // 如果没有配置 Supabase，返回错误
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase 未配置，无法创建活动')
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIG_ERROR',
          message: '系统未配置 Supabase'
        },
        { status: 500 }
      )
    }

    // 创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseKey)

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
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_FIELDS',
          message: '缺少必需字段'
        },
        { status: 400 }
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
      console.error('❌ 创建活动失败:', eventError)
      return NextResponse.json(
        {
          success: false,
          error: 'CREATE_ERROR',
          message: '创建活动失败'
        },
        { status: 500 }
      )
    }

    // 如果有价格信息，创建价格记录
    if (prices && Array.isArray(prices) && prices.length > 0) {
      const priceRecords = prices.map(price => ({
        event_id: event.id,
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
        console.error('❌ 创建价格失败:', pricesError)
        // 即使价格创建失败，也返回活动创建成功
      }
    }

    console.log('✅ 活动创建成功:', event.id)

    return NextResponse.json({
      success: true,
      data: event,
      message: '活动创建成功'
    })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
