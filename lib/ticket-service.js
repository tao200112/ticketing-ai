import { prisma } from './db';
import { generateTicketQRPayload, calculateTicketExpiration } from './qr-crypto';
import { supabase } from './supabaseClient';
import { hasSupabase } from './safeEnv';

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
  let existingOrder = null;
  
  if (hasSupabase() && supabase) {
    // 使用Supabase检查
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, tickets(*)')
      .eq('stripe_session_id', sessionId)
      .limit(1);
    
    if (orders && orders.length > 0) {
      existingOrder = orders[0];
      console.log(`[TicketService] Order already exists for session ${sessionId}`);
      return existingOrder;
    }
  } else {
    // 使用Prisma检查
    existingOrder = await prisma.order.findUnique({
      where: { sessionId },
      include: { tickets: true }
    });

    if (existingOrder) {
      console.log(`[TicketService] Order already exists for session ${sessionId}`);
      return existingOrder;
    }
  }

  // 从 metadata 中提取信息
  const eventId = metadata?.event_id || 'unknown';
  const tier = metadata?.tier || 'basic';
  const quantity = parseInt(metadata?.quantity) || 1;
  const userId = metadata?.user_id || null;

  console.log(`[TicketService] Processing new order:`, {
    sessionId,
    eventId,
    tier,
    quantity,
    amount: amount_total,
    email: customer_email,
    userId
  });

  // 创建订单
  let order;
  
  if (hasSupabase() && supabase) {
    // 使用Supabase创建订单
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        stripe_session_id: sessionId,
        customer_email: customer_email,
        total_amount_cents: amount_total,
        currency: currency || 'usd',
        status: 'paid',
        metadata: {
          payment_intent: payment_intent,
          event_id: eventId,
          tier: tier,
          user_id: userId
        }
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('[TicketService] Error creating order in Supabase:', orderError);
      throw new Error('Failed to create order');
    }
    order = orderData;
  } else {
    // 使用Prisma创建订单
    order = await prisma.order.create({
      data: {
        sessionId,
        paymentIntent: payment_intent,
        email: customer_email,
        eventId,
        tier,
        amount: amount_total,
        currency: currency || 'usd',
        status: 'paid',
        userId: userId
      }
    });
  }

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
    
    let ticket;
    
    if (hasSupabase() && supabase) {
      // 使用Supabase创建票据
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          short_id: shortId,
          order_id: order.id,
          event_id: eventId,
          tier: tier,
          holder_email: customer_email,
          status: 'unused',
          qr_payload: qrPayload
        })
        .select()
        .single();
      
      if (ticketError) {
        console.error('[TicketService] Error creating ticket in Supabase:', ticketError);
        throw new Error('Failed to create ticket');
      }
      ticket = ticketData;
    } else {
      // 使用Prisma创建票据
      ticket = await prisma.ticket.create({
        data: {
          shortId,
          orderId: order.id,
          eventId,
          tier,
          holderEmail: customer_email,
          status: 'unused',
          qrPayload,
          userId: userId
        }
      });
    }
    
    tickets.push(ticket);
  }

  console.log(`[TicketService] Created order ${order.id} with ${tickets.length} tickets`);

  // 注意：localStorage保存逻辑已移至客户端
  // 服务器端只负责数据库操作
  console.log('[TicketService] Ticket creation completed, localStorage operations handled on client side');

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

/**
 * 获取用户的票据历史
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 用户的票据列表
 */
export async function getUserTickets(userId) {
  if (hasSupabase() && supabase) {
    // 使用Supabase获取票据
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        id,
        short_id,
        tier,
        holder_email,
        status,
        used_at,
        created_at,
        qr_payload,
        orders (
          id,
          customer_email,
          total_amount_cents,
          currency,
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[TicketService] Error fetching user tickets from Supabase:', error);
      return [];
    }
    
    return tickets || [];
  } else {
    // 使用Prisma获取票据
    return await prisma.ticket.findMany({
      where: { userId },
      include: { 
        order: true,
        event: {
          select: {
            title: true,
            start_at: true,
            end_at: true,
            venue_name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

/**
 * 通过邮箱获取用户的票据历史
 * @param {string} email - 用户邮箱
 * @returns {Promise<Array>} 用户的票据列表
 */
export async function getUserTicketsByEmail(email) {
  if (hasSupabase() && supabase) {
    // 使用Supabase获取票据
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        id,
        short_id,
        tier,
        holder_email,
        status,
        used_at,
        created_at,
        qr_payload,
        orders (
          id,
          customer_email,
          total_amount_cents,
          currency,
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
      .eq('holder_email', email)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[TicketService] Error fetching tickets by email from Supabase:', error);
      return [];
    }
    
    return tickets || [];
  } else {
    // 使用Prisma获取票据
    return await prisma.ticket.findMany({
      where: { holderEmail: email },
      include: { 
        order: true,
        event: {
          select: {
            title: true,
            start_at: true,
            end_at: true,
            venue_name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
