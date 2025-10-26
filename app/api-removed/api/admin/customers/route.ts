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

    const { data: customers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Customers fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch customers from database' },
        { status: 500 }
      )
    }

    return NextResponse.json(customers || [])
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers from database' },
      { status: 500 }
    )
  }
}
