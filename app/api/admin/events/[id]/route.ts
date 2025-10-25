// @ts-nocheck
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      maxAttendees,
      ticketTypes,
      status
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Update event
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .update({
        title: title as string,
        description: description as string,
        start_date: startDate as string,
        end_date: endDate as string,
        location: location as string,
        max_attendees: maxAttendees || null,
        ticket_types: ticketTypes || [],
        status: (status || 'active') as string,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Event update error:', error)
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    console.error('Event update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Delete event
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Event deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Event deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
