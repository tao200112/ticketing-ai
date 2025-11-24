import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function updateMerchant(request, params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { max_events, region_id } = body

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const updateData = {}

    if (max_events !== undefined && max_events !== null) {
      const parsedMaxEvents = parseInt(max_events, 10)
      if (Number.isNaN(parsedMaxEvents) || parsedMaxEvents < 0) {
        return NextResponse.json(
          { error: 'max_events must be a non-negative number' },
          { status: 400 }
        )
      }
      updateData.max_events = parsedMaxEvents
    }

    if (region_id !== undefined) {
      if (!region_id || typeof region_id !== 'string') {
        return NextResponse.json(
          { error: 'region_id is required and must be a UUID' },
          { status: 400 }
        )
      }
      updateData.region_id = region_id
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('merchants')
      .update(updateData)
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
    console.error('Error updating merchant record:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, context) {
  return updateMerchant(request, context.params)
}

export async function PUT(request, context) {
  return updateMerchant(request, context.params)
}
