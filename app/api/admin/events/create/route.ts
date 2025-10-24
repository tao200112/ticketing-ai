import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      maxAttendees,
      ticketTypes,
      merchantId
    } = await request.json()

    if (!title || !description || !startDate || !endDate || !location || !merchantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create event
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        location,
        max_attendees: maxAttendees || null,
        merchant_id: merchantId,
        status: 'active',
        ticket_types: ticketTypes || []
      })
      .select('*')
      .single()

    if (error) {
      console.error('Event creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    console.error('Event creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
