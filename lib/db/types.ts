/**
 * 数据库类型定义 (v2 - 统一模型)
 * 基于真实的 Supabase 表结构
 * 对外暴露统一模型，隐藏数据库 snake_case 细节
 */

// ============ 事件相关类型 ============

export interface EventModel {
  id: string
  slug: string
  title: string
  description: string
  startAt: string // ISO 8601 datetime
  endAt: string // ISO 8601 datetime
  venueName: string
  address: string
  posterUrl: string | null
  status: 'published' | 'draft'
  createdAt: string
  updatedAt: string
  merchantId: string | null
}

export interface PriceModel {
  id: string
  eventId: string
  name: string // e.g. "Regular Ticket (21+)"
  amountCents: number // e.g. 1500 = $15.00
  currency: string // e.g. "usd"
  inventory: number
  soldCount: number
  limitPerUser: number
  isActive: boolean
  validFrom?: string
  validTo?: string
  createdAt: string
  updatedAt: string
}

// ============ 订单相关类型 ============

export interface OrderModel {
  id: string
  stripeSessionId: string
  stripePaymentIntent: string | null
  customerEmail: string
  eventId: string
  tier: string
  totalAmountCents: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  userId: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderWithTicketsModel extends OrderModel {
  tickets: TicketModel[]
}

// ============ 票据相关类型 ============

export interface TicketModel {
  id: string
  shortId: string // 8 位可读 ID
  orderId: string
  eventId: string
  holderEmail: string
  tier: string
  priceCents: number
  status: 'unused' | 'used'
  qrPayload: string
  issuedAt: string
  usedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============ 用户相关类型 ============

export interface UserModel {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

// ============ 商家相关类型 ============

export interface MerchantModel {
  id: string
  email: string
  businessName: string
  createdAt: string
  updatedAt: string
}

// ============ 带关联的复合类型 ============

export interface EventWithPricesModel extends EventModel {
  prices: PriceModel[]
}

export interface TicketWithOrderModel extends TicketModel {
  order: OrderModel
}

export interface TicketWithEventModel extends TicketModel {
  event: EventModel
}
