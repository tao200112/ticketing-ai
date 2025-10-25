import { NextResponse } from 'next/server';
import { getOrderByStripeSession } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

/**
 * 根据 session_id 获取订单和票据信息
 * GET /api/orders/by-session?session_id=cs_xxx
 * 
 * PR-2: 使用数据访问层统一查询
 */
export async function GET(request) {
  const logger = createLogger('orders/by-session');
  const requestId = getRequestId(request);
  const startTime = Date.now()
  
  try {
    logger.start({
      requestId,
      http: {
        method: 'GET',
        url: '/api/orders/by-session'
      }
    });
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      logger.warn('Missing session_id parameter', { requestId });
      return NextResponse.json({
        ok: false,
        code: 'MISSING_PARAM',
        message: 'Missing session_id parameter'
      }, { status: 400 });
    }

    logger.info('Fetching order for session', {
      requestId,
      sessionId: sessionId.substring(0, 8) + '...'
    });

    // 使用数据访问层查询
    const orderData = await getOrderByStripeSession(sessionId);

    if (!orderData) {
      logger.warn('Order not found for session', {
        requestId,
        sessionId: sessionId.substring(0, 8) + '...'
      });
      return NextResponse.json({
        ok: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found'
      }, { status: 404 });
    }

    // 标准化响应结构
    const response = {
      ok: true,
      order: {
        id: orderData.id,
        sessionId: orderData.stripeSessionId,
        email: orderData.customerEmail,
        eventId: orderData.eventId,
        tier: orderData.tier,
        amount: orderData.totalAmountCents,
        currency: orderData.currency,
        status: orderData.status,
        createdAt: orderData.createdAt,
        ticketCount: orderData.tickets.length
      },
      tickets: orderData.tickets.map(ticket => ({
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

    logger.success('Retrieved order successfully', {
      requestId,
      orderId: orderData.id,
      ticketCount: orderData.tickets.length,
      duration_ms: Date.now() - startTime,
      http: { status: 200 }
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error retrieving order', error, {
      requestId,
      sessionId: sessionId?.substring(0, 8),
      duration_ms: Date.now() - startTime,
      needs_attention: true
    });
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }, { status: 500 });
  }
}
