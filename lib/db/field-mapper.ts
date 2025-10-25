/**
 * 字段映射层
 * 统一处理 Stripe → Database 的字段转换
 * 确保所有字段名与数据库真实字段一致
 */

import type Stripe from 'stripe'

/**
 * Stripe Session → Order 字段映射
 */
export function mapStripeSessionToOrder(session: Stripe.Checkout.Session) {
  return {
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent as string | null,
    customer_email: session.customer_email || session.customer_details?.email || '',
    event_id: session.metadata?.event_id || 'unknown',
    tier: session.metadata?.tier || 'basic',
    total_amount_cents: session.amount_total || 0,
    currency: session.currency || 'usd',
    status: 'paid' as const,
    user_id: session.metadata?.user_id || null,
  }
}

/**
 * 验证 Order 数据完整性
 */
export function validateOrderData(data: Record<string, any>): void {
  const required = ['stripe_session_id', 'customer_email', 'total_amount_cents']
  
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

/**
 * 验证 Ticket 数据完整性
 */
export function validateTicketData(data: Record<string, any>): void {
  const required = ['order_id', 'event_id', 'holder_email', 'qr_payload']
  
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

/**
 * 生成短票据 ID (8 位可读)
 */
export function generateShortTicketId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
