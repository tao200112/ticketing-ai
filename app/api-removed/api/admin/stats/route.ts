import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 检查Supabase配置
    if (!supabaseAdmin) {
      console.log('Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured. Please set up Supabase environment variables.' },
        { status: 500 }
      )
    }

    const [
      { count: users },
      { count: merchants },
      { count: events },
      { count: orders },
      { count: tickets }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('merchants').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('tickets').select('*', { count: 'exact', head: true })
    ])

    return NextResponse.json({
      users: users || 0,
      merchants: merchants || 0,
      events: events || 0,
      orders: orders || 0,
      tickets: tickets || 0
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics from database' },
      { status: 500 }
    )
  }
}
