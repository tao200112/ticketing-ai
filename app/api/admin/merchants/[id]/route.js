import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { max_events } = body

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    if (max_events === undefined || max_events === null) {
      return NextResponse.json(
        { error: 'max_events is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update merchant max_events
    const { data, error } = await supabase
      .from('merchants')
      .update({ max_events: parseInt(max_events) })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating merchant:', error)
      return NextResponse.json(
        { error: 'Failed to update merchant' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in PUT /api/admin/merchants/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

