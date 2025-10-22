import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db.js';

/**
 * 根据 session_id 获取订单和票据信息
 * GET /api/orders/by-session?session_id=cs_xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing session_id parameter'
      }, { status: 400 });
    }

    // 查询订单和关联的票据
    const order = await prisma.order.findUnique({
      where: { sessionId },
      include: { 
        tickets: {
          orderBy: { issuedAt: 'asc' }
        }
      }
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    // 格式化返回数据
    const response = {
      success: true,
      order: {
        id: order.id,
        sessionId: order.sessionId,
        email: order.email,
        eventId: order.eventId,
        tier: order.tier,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
        ticketCount: order.tickets.length
      },
      tickets: order.tickets.map(ticket => ({
        id: ticket.shortId,
        eventId: ticket.eventId,
        tier: ticket.tier,
        holderEmail: ticket.holderEmail,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        usedAt: ticket.usedAt,
        qrPayload: ticket.qrPayload
      }))
    };

    console.log(`[OrdersBySession] Retrieved order ${order.id} with ${order.tickets.length} tickets`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[OrdersBySession] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
