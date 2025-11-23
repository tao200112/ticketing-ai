export type RedemptionState = 'idle' | 'warning' | 'confirm' | 'redeeming' | 'redeemed'

export type TicketRecord = {
  id: string
  ticket_kind: any
  used?: boolean
  used_at?: string | null
  status?: string
  short_id?: string
  event_snapshot?: {
    title?: string | null
    start_at?: string | null
    venue?: string | null
  } | null
  events?: {
    id?: string
    title?: string | null
    start_at?: string | null
    venue_name?: string | null
    address?: string | null
  } | null
  [key: string]: any
}

