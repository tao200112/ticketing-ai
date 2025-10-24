import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select(`
        *,
        users!merchants_owner_user_id_fkey (
          id,
          email,
          name,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Merchants fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch merchants' },
        { status: 500 }
      )
    }

    return NextResponse.json(merchants || [])
  } catch (error) {
    console.error('Merchants API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
