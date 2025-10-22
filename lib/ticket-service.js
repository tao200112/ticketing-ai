import { prisma } from './db';
import { generateTicketQRPayload, calculateTicketExpiration } from './qr-crypto';

/**
 * 生成短可读的票务 ID
 */
function generateShortTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 处理支付完成的订单
 * @param {Object} sessionData - Stripe checkout session 数据
 * @returns {Promise<Object>} 创建的订单和票务信息
 */
export async function processPaidOrder(sessionData) {
  const {
    id: sessionId,
    payment_intent,
    customer_email,
    amount_total,
    currency,
    metadata
  } = sessionData;

  // 幂等检查：如果 session_id 已存在，直接返回
  const existingOrder = await prisma.order.findUnique({
    where: { sessionId },
    include: { tickets: true }
  });

  if (existingOrder) {
    console.log(`[TicketService] Order already exists for session ${sessionId}`);
    return existingOrder;
  }

  // 从 metadata 中提取信息
  const eventId = metadata?.event_id || 'unknown';
  const tier = metadata?.tier || 'basic';
  const quantity = parseInt(metadata?.quantity) || 1;

  console.log(`[TicketService] Processing new order:`, {
    sessionId,
    eventId,
    tier,
    quantity,
    amount: amount_total,
    email: customer_email
  });

  // 创建订单
  const order = await prisma.order.create({
    data: {
      sessionId,
      paymentIntent: payment_intent,
      email: customer_email,
      eventId,
      tier,
      amount: amount_total,
      currency: currency || 'usd',
      status: 'paid'
    }
  });

  // 获取活动信息以计算过期时间
  // 这里假设活动结束时间，实际应该从数据库或配置中获取
  const eventEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 默认7天后结束
  const expTs = calculateTicketExpiration(eventEndTime);

  // 生成票务
  const tickets = [];
  for (let i = 0; i < quantity; i++) {
    const shortId = generateShortTicketId();
    
    // 生成二维码载荷
    const qrPayload = generateTicketQRPayload(shortId, expTs);
    
    const ticket = await prisma.ticket.create({
      data: {
        shortId,
        orderId: order.id,
        eventId,
        tier,
        holderEmail: customer_email,
        status: 'unused',
        qrPayload
      }
    });
    
    tickets.push(ticket);
  }

  console.log(`[TicketService] Created order ${order.id} with ${tickets.length} tickets`);

  return {
    order,
    tickets
  };
}

/**
 * 获取订单信息
 * @param {string} sessionId - Stripe session ID
 * @returns {Promise<Object|null>} 订单信息
 */
export async function getOrderBySessionId(sessionId) {
  return await prisma.order.findUnique({
    where: { sessionId },
    include: { tickets: true }
  });
}

/**
 * 获取票务信息
 * @param {string} shortId - 票务短 ID
 * @returns {Promise<Object|null>} 票务信息
 */
export async function getTicketByShortId(shortId) {
  return await prisma.ticket.findUnique({
    where: { shortId },
    include: { order: true }
  });
}

/**
 * 使用票务
 * @param {string} shortId - 票务短 ID
 * @returns {Promise<Object|null>} 更新后的票务信息
 */
export async function useTicket(shortId) {
  const ticket = await prisma.ticket.findUnique({
    where: { shortId }
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  if (ticket.status !== 'unused') {
    throw new Error('Ticket already used or refunded');
  }

  return await prisma.ticket.update({
    where: { shortId },
    data: {
      status: 'used',
      usedAt: new Date()
    },
    include: { order: true }
  });
}
