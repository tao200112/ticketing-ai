import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET() {
  try {
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminTickets] Tickets fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json(tickets || []);
  } catch (error) {
    console.error('[AdminTickets] Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
