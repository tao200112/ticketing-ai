import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (id === 'ridiculous-chicken') {
      const defaultEvent = {
        id: 'ridiculous-chicken',
        title: 'Ridiculous Chicken Night Event',
        name: 'Ridiculous Chicken Night Event',
        description: 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.',
        location: 'Shanghai Concert Hall',
        start_at: '2025-10-25T20:00:00Z',
        merchants: { name: 'PartyTix Events' },
        prices: [
          { id: 'regular', name: 'Regular Ticket (21+)', amount_cents: 1500, inventory: 100 },
          { id: 'special', name: 'Special Ticket (18-20)', amount_cents: 3000, inventory: 50 }
        ]
      }
      return NextResponse.json({ success: true, data: defaultEvent })
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'CONFIG_ERROR', message: 'Supabase 未配置' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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
      return NextResponse.json({ success: false, error: 'EVENT_NOT_FOUND', message: '活动不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: event })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'CONFIG_ERROR', message: '系统未配置 Supabase' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 删除价格记录
    await supabase.from('prices').delete().eq('event_id', id)

    // 删除活动
    const { error } = await supabase.from('events').delete().eq('id', id)

    if (error) {
      console.error('❌ 删除活动失败:', error)
      return NextResponse.json({ success: false, error: 'DELETE_ERROR', message: '删除活动失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '活动删除成功' })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, startTime, endTime, location, poster_url, status } = body

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'CONFIG_ERROR', message: '系统未配置 Supabase' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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
      console.error('❌ 更新活动失败:', error)
      return NextResponse.json({ success: false, error: 'UPDATE_ERROR', message: '更新活动失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: event, message: '活动更新成功' })

  } catch (error) {
    console.error('❌ API 错误:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
