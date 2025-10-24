import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { order, tickets, userId, customerEmail, eventTitle, tier, amount, quantity } = await request.json();

    // 创建购买记录
    const purchaseRecord = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      sessionId: order.session_id || order.sessionId,
      customerEmail: customerEmail,
      customerName: customerEmail.split('@')[0], // 从邮箱提取姓名
      eventId: order.event_id || order.eventId,
      eventTitle: eventTitle,
      ticketType: tier,
      quantity: quantity,
      amount: amount,
      currency: order.currency || 'usd',
      status: 'completed',
      purchaseDate: new Date().toISOString(),
      merchantId: order.merchant_id || 'unknown',
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        shortId: ticket.short_id || ticket.shortId,
        tier: ticket.tier,
        status: ticket.status,
        qrPayload: ticket.qr_payload || ticket.qrPayload
      }))
    };

    // 创建用户票据记录
    const userTicketRecord = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventName: eventTitle,
      ticketType: tier,
      price: (amount / 100).toFixed(2),
      purchaseDate: new Date().toLocaleDateString('en-US'),
      status: 'valid',
      customerEmail: customerEmail,
      sessionId: order.session_id || order.sessionId,
      qrCode: JSON.stringify({
        ticketId: `ticket_${Date.now()}`,
        eventName: eventTitle,
        ticketType: tier,
        purchaseDate: new Date().toLocaleDateString('en-US'),
        price: (amount / 100).toFixed(2),
        customerEmail: customerEmail
      })
    };

    return NextResponse.json({
      success: true,
      purchaseRecord,
      userTicketRecord,
      message: '票据记录已准备，请在前端保存到localStorage'
    });

  } catch (error) {
    console.error('Error preparing ticket records:', error);
    return NextResponse.json(
      { error: 'Failed to prepare ticket records' },
      { status: 500 }
    );
  }
}
