import { generateTicketQRPayload, calculateTicketExpiration } from './qr-crypto';
import { supabase } from './supabaseClient';
import { hasSupabase } from './safeEnv';
import { generateShortTicketId } from './ticket-utils';

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
  if (!hasSupabase() || !supabase) {
    throw new Error('Supabase not available')
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, tickets(*)')
    .eq('stripe_session_id', sessionId)
    .limit(1);
  
  if (orders && orders.length > 0) {
    console.log(`[TicketService] Order already exists for session ${sessionId}`);
    return orders[0];
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
        tier: tier
      }
    })
    .select()
    .single();
  
  if (orderError) {
    console.error('[TicketService] Error creating order in Supabase:', orderError);
    throw new Error('Failed to create order');
  }
  
  const order = orderData;

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
    
    const ticket = ticketData;
    
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
 * 获取用户的票据历史
 * @param {string} supabaseUid - Supabase Auth UID（必须）
 * @returns {Promise<Array>} 用户的票据列表
 */
export async function getUserTickets(supabaseUid) {
  if (!supabaseUid) {
    console.error('[TicketService] supabaseUid is required')
    return []
  }

  if (!hasSupabase() || !supabase) {
    console.error('[TicketService] Supabase not available')
    return []
  }

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
    .eq('supabase_uid', supabaseUid)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[TicketService] Error fetching user tickets from Supabase:', error);
    return [];
  }
  
  return tickets || [];
}

/**
 * 通过邮箱获取用户的票据历史
 * @param {string} email - 用户邮箱
 * @returns {Promise<Array>} 用户的票据列表
 */
export async function getUserTicketsByEmail(email) {
  if (!hasSupabase() || !supabase) {
    console.error('[TicketService] Supabase not available')
    return []
  }

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
}
