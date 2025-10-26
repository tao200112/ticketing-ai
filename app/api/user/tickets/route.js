import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 获取所有票据（临时实现，实际应该根据用户身份过滤）
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders (
          id,
          customer_email,
          total_amount_cents,
          status,
          created_at
        ),
        events (
          id,
          title,
          start_at,
          end_at,
          venue_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UserTickets] Tickets fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    // 转换数据格式
    const formattedTickets = (tickets || []).map(ticket => ({
      id: ticket.id,
      short_id: ticket.short_id,
      tier: ticket.tier,
      price_cents: ticket.price_cents,
      status: ticket.status,
      issued_at: ticket.issued_at,
      used_at: ticket.used_at,
      qr_payload: ticket.qr_payload,
      holder_email: ticket.holder_email,
      event_title: ticket.events?.title,
      event_start: ticket.events?.start_at,
      event_location: ticket.events?.venue_name,
      order_id: ticket.orders?.id,
      order_total: ticket.orders?.total_amount_cents,
      order_status: ticket.orders?.status,
      order_date: ticket.orders?.created_at
    }));

    return NextResponse.json(formattedTickets);
  } catch (error) {
    console.error('[UserTickets] Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}