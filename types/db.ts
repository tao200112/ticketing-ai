// PartyTix 数据库通用类型定义

export interface Event {
  id: string
  name: string
  description?: string
  location: string
  start_date: string
  end_date?: string
  max_attendees?: number
  current_attendees: number
  status: 'active' | 'inactive' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Price {
  id: string
  event_id: string
  name: string
  amount: number // 以分为单位
  currency: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id?: string
  event_id: string
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  total_amount: number // 以分为单位
  currency: string
  stripe_session_id?: string
  stripe_payment_intent_id?: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  order_id: string
  event_id: string
  price_id: string
  qr_code: string
  status: 'active' | 'used' | 'cancelled'
  attendee_name?: string
  attendee_email?: string
  used_at?: string
  created_at: string
  updated_at: string
}

// 扩展类型，包含关联数据
export interface OrderWithDetails extends Order {
  event: Event
  tickets: Ticket[]
  prices: Price[]
}

export interface TicketWithDetails extends Ticket {
  order: Order
  event: Event
  price: Price
}
