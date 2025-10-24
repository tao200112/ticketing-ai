import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        merchants!events_merchant_id_fkey (
          id,
          name,
          contact_email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Events fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    return NextResponse.json(events || [])
  } catch (error) {
    console.error('Events API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
