import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = createSupabaseClient()
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('regions')
      .select('*')
      .order('created_at', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[regions-api] Failed to load regions', error)
      return NextResponse.json(
        { success: false, error: 'Failed to load regions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('[regions-api] Unexpected error', error)
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading regions' },
      { status: 500 }
    )
  }
}

