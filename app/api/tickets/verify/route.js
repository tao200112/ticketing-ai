import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { verifyTicketQRPayload, extractTicketIdFromQR } from '../../../../lib/qr-crypto';

/**
 * 票据核销验证接口
 * POST /api/tickets/verify
 * 
 * 请求体：
 * {
 *   "qr_payload": "TKT.ticket_id.exp_ts.sig"  // 二维码载荷
 * }
 * 
 * 或者手动输入：
 * {
 *   "ticket_id": "TKT123456",
 *   "exp_ts": 1234567890,
 *   "sig": "signature"
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { qr_payload, ticket_id, exp_ts, sig } = body;

    let qrPayload;
    let ticketId;

    // 处理二维码载荷或手动输入
    if (qr_payload) {
      // 使用二维码载荷
      qrPayload = qr_payload;
      ticketId = extractTicketIdFromQR(qr_payload);
      
      if (!ticketId) {
        return NextResponse.json({
          success: false,
          error: 'Invalid QR payload format',
          code: 'INVALID_QR_FORMAT'
        }, { status: 400 });
      }
    } else if (ticket_id && exp_ts && sig) {
      // 手动输入参数
      qrPayload = `TKT.${ticket_id}.${exp_ts}.${sig}`;
      ticketId = ticket_id;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters. Provide either qr_payload or (ticket_id, exp_ts, sig)',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    // 验证二维码载荷
    const verification = verifyTicketQRPayload(qrPayload);
    
    if (!verification.valid) {
      return NextResponse.json({
        success: false,
        error: verification.error,
        code: verification.error === 'Ticket expired' ? 'EXPIRED' : 'INVALID_SIGNATURE'
      }, { status: 400 });
    }

    // 查询票据信息
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders (*)
      `)
      .eq('short_id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({
        success: false,
        error: 'Ticket not found',
        code: 'TICKET_NOT_FOUND'
      }, { status: 404 });
    }

    // 检查票据状态
    if (ticket.status === 'used') {
      return NextResponse.json({
        success: false,
        error: 'Ticket already used',
        code: 'ALREADY_USED',
        ticket: {
          id: ticket.shortId,
          status: ticket.status,
          usedAt: ticket.usedAt,
          holderEmail: ticket.holderEmail,
          eventId: ticket.eventId,
          tier: ticket.tier
        }
      }, { status: 400 });
    }

    if (ticket.status === 'refunded') {
      return NextResponse.json({
        success: false,
        error: 'Ticket has been refunded',
        code: 'REFUNDED',
        ticket: {
          id: ticket.shortId,
          status: ticket.status,
          holderEmail: ticket.holderEmail,
          eventId: ticket.eventId,
          tier: ticket.tier
        }
      }, { status: 400 });
    }

    if (ticket.status !== 'unused') {
      return NextResponse.json({
        success: false,
        error: 'Invalid ticket status',
        code: 'INVALID_STATUS',
        ticket: {
          id: ticket.shortId,
          status: ticket.status
        }
      }, { status: 400 });
    }

    // 核销票据
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('short_id', ticketId)
      .select(`
        *,
        orders (*)
      `)
      .single();

    if (updateError) {
      console.error('Ticket update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify ticket',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    console.log(`[TicketVerify] Ticket ${ticketId} successfully verified and marked as used`);

    return NextResponse.json({
      success: true,
      message: 'Ticket verified and marked as used',
      ticket: {
        id: updatedTicket.shortId,
        status: updatedTicket.status,
        usedAt: updatedTicket.usedAt,
        holderEmail: updatedTicket.holderEmail,
        eventId: updatedTicket.eventId,
        tier: updatedTicket.tier,
        orderId: updatedTicket.orderId
      }
    });

  } catch (error) {
    console.error('[TicketVerify] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * 获取票据验证状态（用于测试）
 * GET /api/tickets/verify?ticket_id=TKT123456
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({
        success: false,
        error: 'Missing ticket_id parameter'
      }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        orders (*)
      `)
      .eq('short_id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({
        success: false,
        error: 'Ticket not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.shortId,
        status: ticket.status,
        usedAt: ticket.usedAt,
        holderEmail: ticket.holderEmail,
        eventId: ticket.eventId,
        tier: ticket.tier,
        qrPayload: ticket.qrPayload,
        issuedAt: ticket.issuedAt
      }
    });

  } catch (error) {
    console.error('[TicketVerify] GET Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
