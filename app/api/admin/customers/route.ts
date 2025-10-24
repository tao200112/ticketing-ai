import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: customers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Customers fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      )
    }

    return NextResponse.json(customers || [])
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
