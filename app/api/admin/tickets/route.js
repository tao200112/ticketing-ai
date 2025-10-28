import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json([])
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查询所有票据
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        *,
        orders (
          id,
          stripe_session_id,
          customer_email,
          total_amount_cents,
          currency,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (ticketsError) {
      console.error('❌ 获取票据失败:', ticketsError)
      return NextResponse.json({ tickets: [], orders: [] })
    }

    // 查询所有订单
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('❌ 获取订单失败:', ordersError)
      return NextResponse.json({ tickets: tickets || [], orders: [] })
    }

    return NextResponse.json({
      tickets: tickets || [],
      orders: orders || []
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
