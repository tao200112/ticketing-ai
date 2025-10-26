import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET() {
  try {
    // 获取所有订单（临时实现，实际应该根据用户身份过滤）
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        tickets (
          id,
          short_id,
          tier,
          price_cents,
          status,
          qr_payload
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UserOrders] Orders fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // 转换数据格式
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      customer_email: order.customer_email,
      total_amount_cents: order.total_amount_cents,
      status: order.status,
      created_at: order.created_at,
      stripe_session_id: order.stripe_session_id,
      stripe_payment_intent: order.stripe_payment_intent,
      tickets_count: order.tickets?.length || 0,
      tickets: order.tickets || []
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('[UserOrders] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
