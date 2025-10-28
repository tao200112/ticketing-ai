import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        users: 0,
        merchants: 0,
        events: 0,
        orders: 0,
        tickets: 0
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 获取统计数据
    const [usersResult, merchantsResult, eventsResult, ordersResult, ticketsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('merchants').select('id', { count: 'exact' }),
      supabase.from('events').select('id', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' }),
      supabase.from('tickets').select('id', { count: 'exact' })
    ])

    const stats = {
      users: usersResult.count || 0,
      merchants: merchantsResult.count || 0,
      events: eventsResult.count || 0,
      orders: ordersResult.count || 0,
      tickets: ticketsResult.count || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
