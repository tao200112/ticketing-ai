// @ts-nocheck
/**
 * 数据访问层接口
 * 
 * 原则：
 * 1. 统一使用 lib/db/index.ts 的接口，不要直接调用 supabase.from()
 * 2. 返回统一模型（camelCase），隐藏数据库字段（snake_case）
 * 3. 所有接口返回统一的类型定义
 */

import { supabaseAdmin } from '../supabase-admin'
import type {
  EventModel,
  EventWithPricesModel,
  PriceModel,
  OrderModel,
  OrderWithTicketsModel,
  TicketModel,
  TicketWithOrderModel,
  TicketWithEventModel,
} from './types'
import { mapStripeSessionToOrder, validateOrderData, validateTicketData } from './field-mapper'

/**
 * 转换数据库字段为统一模型
 */
function mapDbToModel(row: any): any {
  return {
    id: row.id,
    // 将 snake_case 转换为 camelCase
    ...Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        value
      ])
    )
  }
}

// ============ 事件相关接口 ============

/**
 * 根据 slug 获取已发布的事件
 */
export async function getPublishedEventBySlug(
  slug: string
): Promise<EventWithPricesModel | null> {
  console.log(`[DB] getPublishedEventBySlug: ${slug}`)
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('[DB] getPublishedEventBySlug error:', error.code, error.message)
    return null
  }

  if (!event) return null

  // 获取价格
  const { data: prices } = await supabaseAdmin
    .from('prices')
    .select('*')
    .eq('event_id', event.id)
    .eq('is_active', true)

  return {
    ...mapDbToModel(event),
    prices: prices?.map(mapDbToModel) || []
  }
}

/**
 * 获取事件的所有活跃价格
 */
export async function listActivePrices(
  eventId: string
): Promise<PriceModel[]> {
  console.log(`[DB] listActivePrices: ${eventId}`)
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: prices, error } = await supabaseAdmin
    .from('prices')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)

  if (error) {
    console.error('[DB] listActivePrices error:', error.code, error.message)
    throw new Error(`Failed to list prices: ${error.message}`)
  }

  return prices?.map(mapDbToModel) || []
}

// ============ 订单相关接口 ============

/**
 * 根据 Stripe Session ID 获取订单
 */
export async function getOrderByStripeSession(
  sessionId: string
): Promise<OrderWithTicketsModel | null> {
  console.log(`[DB] getOrderByStripeSession: ${sessionId.substring(0, 8)}...`)
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // 订单不存在
      return null
    }
    console.error('[DB] getOrderByStripeSession error:', error.code, error.message)
    throw new Error(`Failed to get order: ${error.message}`)
  }

  if (!order) return null

  // 获取票据
  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('order_id', order.id)

  if (ticketsError) {
    console.error('[DB] getTickets error:', ticketsError.code, ticketsError.message)
  }

  return {
    ...mapDbToModel(order),
    tickets: tickets?.map(mapDbToModel) || []
  }
}

/**
 * 从 Stripe Session 创建订单
 */
export async function createOrderFromStripeSession(session: any): Promise<OrderModel> {
  console.log(`[DB] createOrderFromStripeSession: ${session.id.substring(0, 8)}...`)
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  // 使用映射层转换字段
  const orderData = mapStripeSessionToOrder(session)
  
  // 验证数据
  validateOrderData(orderData)

  // 检查订单是否已存在（幂等）
  const existing = await getOrderByStripeSession(session.id)
  if (existing) {
    console.log('[DB] Order already exists, returning existing')
    return existing
  }

  // 插入订单
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) {
    console.error('[DB] createOrder error:', error.code, error.message)
    throw new Error(`Failed to create order: ${error.message}`)
  }

  console.log(`[DB] Order created: ${order.id}`)
  return mapDbToModel(order)
}

// ============ 票据相关接口 ============

/**
 * 根据票据 ID 获取票据信息
 */
export async function getTicketById(
  ticketId: string
): Promise<TicketWithOrderModel | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('*, orders(*)')
    .eq('short_id', ticketId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('[DB] getTicketById error:', error.code, error.message)
    return null
  }

  if (!ticket) return null

  return {
    ...mapDbToModel(ticket),
    order: mapDbToModel(ticket.orders)
  }
}

/**
 * 为订单创建票据（幂等实现）
 * 
 * 功能：
 * 1. 检查是否已有票据（幂等）
 * 2. 生成唯一短码和二维码载荷
 * 3. 批量创建票据
 */
export async function issueTicketsForOrder(
  order: OrderModel,
  opts: { quantity: number; userEmail: string; eventId: string }
): Promise<TicketModel[]> {
  console.log(`[DB] issueTicketsForOrder: order=${order.id}, qty=${opts.quantity}`)
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  // 检查是否已有票据（幂等）
  const { data: existingTickets } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('order_id', order.id)

  if (existingTickets && existingTickets.length > 0) {
    console.log(`[DB] Tickets already exist for order ${order.id}, returning existing`)
    return existingTickets.map(mapDbToModel)
  }

  // 生成票据数据
  const tickets = []
  for (let i = 0; i < opts.quantity; i++) {
    const shortId = generateShortTicketId()
    const qrPayload = generateQRPayload({
      code: shortId,
      eventId: opts.eventId,
      userEmail: opts.userEmail,
      issuedAt: new Date().toISOString(),
      expAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后过期
      orderId: order.id
    })

    tickets.push({
      order_id: order.id,
      event_id: opts.eventId,
      holder_email: opts.userEmail,
      tier: order.tier,
      price_cents: order.totalAmountCents / opts.quantity, // 平均分配价格
      qr_payload: qrPayload,
      short_id: shortId,
      status: 'unused'
    })
  }

  // 批量创建票据
  const { data: createdTickets, error } = await supabaseAdmin
    .from('tickets')
    .insert(tickets)
    .select()

  if (error) {
    console.error('[DB] issueTicketsForOrder error:', error.code, error.message)
    throw new Error(`Failed to create tickets: ${error.message}`)
  }

  console.log(`[DB] Created ${createdTickets.length} tickets for order ${order.id}`)
  return createdTickets.map(mapDbToModel)
}

/**
 * 生成短票据 ID（8 位可读）
 */
function generateShortTicketId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 生成二维码载荷（JSON + HMAC 签名）
 */
function generateQRPayload(data: {
  code: string
  eventId: string
  userEmail: string
  issuedAt: string
  expAt: string
  orderId: string
}): string {
  const crypto = require('crypto')
  const salt = process.env.QR_SALT || 'default-salt'
  
  // 创建签名载荷
  const payload = {
    ...data,
    sig: crypto
      .createHmac('sha256', salt)
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16) // 16位签名
  }
  
  return JSON.stringify(payload)
}

/**
 * 批量创建票据
 */
export async function createTickets(
  tickets: Array<{
    order_id: string
    event_id: string
    holder_email: string
    tier: string
    price_cents: number
    qr_payload: string
  }>
): Promise<TicketModel[]> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  // 验证所有票据数据
  for (const ticket of tickets) {
    validateTicketData(ticket)
  }

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .insert(tickets)
    .select()

  if (error) {
    console.error('[DB] createTickets error:', error.code, error.message)
    throw new Error(`Failed to create tickets: ${error.message}`)
  }

  return data?.map(mapDbToModel) || []
}

/**
 * 标记票据为已使用
 */
export async function markTicketAsUsed(
  ticketId: string
): Promise<TicketModel | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('short_id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('[DB] markTicketAsUsed error:', error.code, error.message)
    return null
  }

  return mapDbToModel(data)
}

// ============ 用户相关接口 ============

/**
 * 根据邮箱获取用户
 */
export async function getUserByEmail(
  email: string
): Promise<{
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
} | null> {
  // TODO: 在 PR-3 中实现（集成 Supabase Auth）
  throw new Error('Not implemented in PR-2')
}

// ============ 导出所有类型 ============

export * from './types'
