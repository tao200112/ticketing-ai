'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TicketCard from '@/components/tickets/TicketCard'
import type { RedemptionState, TicketRecord } from '@/components/tickets/types'
import { useAuth } from '@/lib/auth-context'
import {
  getTicketKindCategoryName,
  isTicketActive,
} from '@/lib/ticket-helpers'

type StatusFilter = 'upcoming' | 'used'
type TicketTab = 'entry' | 'drink' | 'other'

type RedemptionStateMeta = {
  state: RedemptionState
  timestamp: number
}

export default function TicketsClient() {
  const router = useRouter()
  const { user, supabase, loading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TicketTab>('entry')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')
  const [showQRCodes, setShowQRCodes] = useState<Record<string, boolean>>({})
  const [redemptionState, setRedemptionState] = useState<
    Record<string, RedemptionStateMeta>
  >({})

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.push('/auth/login?redirect=/tickets')
    }
  }, [authLoading, user, router])

  const fetchTickets = useCallback(async () => {
    if (!supabase || !user) {
      return
    }

    setLoadingTickets(true)
    setError(null)

    const { data, error: ticketsError } = await supabase
      .from('tickets')
      .select(
        `
        *,
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
          venue_name,
          address
        )
      `.trim()
      )
      .eq('supabase_uid', user.id)
      .order('created_at', { ascending: false })

    if (ticketsError) {
      console.error('Failed to fetch tickets:', ticketsError)
      setError('加载门票失败，请稍后再试。')
      setTickets([])
    } else {
      setTickets(data || [])
    }

    setLoadingTickets(false)
  }, [supabase, user])

  useEffect(() => {
    if (!authLoading && user && supabase) {
      fetchTickets()
    }
  }, [authLoading, user, supabase, fetchTickets])

  const categorizedTickets = useMemo(() => {
    const entry: TicketRecord[] = []
    const drink: TicketRecord[] = []
    const other: TicketRecord[] = []

    tickets.forEach((ticket) => {
      const category = getTicketKindCategoryName(ticket.ticket_kind)
      if (category === 'Entry Tickets') {
        entry.push(ticket)
      } else if (category === 'Drink Tickets') {
        drink.push(ticket)
      } else {
        other.push(ticket)
      }
    })

    return { entry, drink, other }
  }, [tickets])

  const tabCounts = useMemo(
    () => ({
      entry: categorizedTickets.entry.length,
      drink: categorizedTickets.drink.length,
      other: categorizedTickets.other.length,
    }),
    [categorizedTickets]
  )

  useEffect(() => {
    if (tickets.length === 0) {
      return
    }

    if (categorizedTickets[activeTab].length === 0) {
      if (categorizedTickets.entry.length > 0) {
        setActiveTab('entry')
      } else if (categorizedTickets.drink.length > 0) {
        setActiveTab('drink')
      } else if (categorizedTickets.other.length > 0) {
        setActiveTab('other')
      }
    }
  }, [categorizedTickets, activeTab, tickets.length])

  const filteredTickets = useMemo(() => {
    const source = categorizedTickets[activeTab] || []
    return source.filter((ticket) =>
      statusFilter === 'upcoming'
        ? isTicketActive(ticket)
        : !isTicketActive(ticket)
    )
  }, [categorizedTickets, activeTab, statusFilter])

  const handleRedemptionTap = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket || !isTicketActive(ticket)) {
      return
    }

    const now = Date.now()
    setRedemptionState((prev) => {
      const current = prev[ticketId] || { state: 'idle' as RedemptionState, timestamp: 0 }
      if (current.timestamp && now - current.timestamp > 10000) {
        return {
          ...prev,
          [ticketId]: { state: 'idle', timestamp: now },
        }
      }

      let nextState: RedemptionState = current.state
      if (current.state === 'idle') {
        nextState = 'warning'
      } else if (current.state === 'warning') {
        nextState = 'confirm'
      }

      return {
        ...prev,
        [ticketId]: { state: nextState, timestamp: now },
      }
    })
  }

  const handleRedemptionLongPress = async (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket || !user || !isTicketActive(ticket)) {
      return
    }

    const current = redemptionState[ticketId]
    if (current?.state !== 'confirm') {
      return
    }

    setRedemptionState((prev) => ({
      ...prev,
      [ticketId]: { state: 'redeeming', timestamp: Date.now() },
    }))

    try {
      const response = await fetch('/api/tickets/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticket_id: ticketId }),
      })

      const result = await response.json()

      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  used: true,
                  status: 'used',
                  used_at: result.data?.used_at || new Date().toISOString(),
                }
              : t
          )
        )
        setRedemptionState((prev) => ({
          ...prev,
          [ticketId]: { state: 'redeemed', timestamp: Date.now() },
        }))
      } else {
        alert(result.message || 'Failed to redeem ticket.')
        setRedemptionState((prev) => ({
          ...prev,
          [ticketId]: { state: 'confirm', timestamp: Date.now() },
        }))
      }
    } catch (err) {
      console.error('Error redeeming ticket:', err)
      alert('Failed to redeem ticket. Please try again.')
      setRedemptionState((prev) => ({
        ...prev,
        [ticketId]: { state: 'confirm', timestamp: Date.now() },
      }))
    }
  }

  const resetRedemptionState = (ticketId: string) => {
    setRedemptionState((prev) => ({
      ...prev,
      [ticketId]: { state: 'idle', timestamp: 0 },
    }))
  }

  const toggleQRCode = (ticketId: string) => {
    setShowQRCodes((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
  }

  const renderContent = () => {
    if (authLoading || loadingTickets) {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                height: '280px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                animation: 'pulse 1.8s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'white',
          }}
        >
          <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>发生错误</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{error}</p>
        </div>
      )
    }

    if (filteredTickets.length === 0) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            borderRadius: '24px',
            border: '1px dashed rgba(255, 255, 255, 0.25)',
            background: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎟️</div>
          <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '8px' }}>
            {statusFilter === 'upcoming' ? '暂无即将使用的门票' : '暂无已使用的门票'}
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            购买活动门票后即可在这里查看。
          </p>
        </div>
      )
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {filteredTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            isUsed={!isTicketActive(ticket)}
            showQR={!!showQRCodes[ticket.id]}
            redemptionState={redemptionState[ticket.id]?.state || 'idle'}
            onRedeemTap={() => handleRedemptionTap(ticket.id)}
            onRedeemLongPress={() => handleRedemptionLongPress(ticket.id)}
            onRedeemReset={() => resetRedemptionState(ticket.id)}
            onToggleQR={toggleQRCode}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #040614 0%, #6d28d9 50%, #0f172a 100%)',
      }}
    >
      <main
        style={{
          paddingTop: '120px',
          paddingBottom: '60px',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <header style={{ marginBottom: '32px', textAlign: 'center' }}>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            PartyTix
          </p>
          <h1
            style={{
              color: 'white',
              fontSize: '3rem',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            My Tickets
          </h1>
          <p
            style={{
              color: 'rgba(226, 232, 240, 0.8)',
              fontSize: '1.2rem',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            查看即将到来的入场与饮品门票，随时展示二维码或安全兑换。
          </p>
        </header>

        <section
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '28px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 60px rgba(2, 6, 23, 0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {(['entry', 'drink', 'other'] as TicketTab[])
                .filter((tab) => tab !== 'other' || tabCounts.other > 0)
                .map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: '0 0 auto',
                      padding: '10px 20px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background:
                        activeTab === tab
                          ? 'linear-gradient(135deg, #7C3AED, #22D3EE)'
                          : 'transparent',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: tabCounts[tab] === 0 ? 'not-allowed' : 'pointer',
                      opacity: tabCounts[tab] === 0 ? 0.4 : 1,
                    }}
                    disabled={tabCounts[tab] === 0}
                  >
                    {tab === 'entry' && 'Entry Tickets'}
                    {tab === 'drink' && 'Drink Tickets'}
                    {tab === 'other' && 'Other'}
                    <span style={{ marginLeft: '6px', fontWeight: 500 }}>
                      ({tabCounts[tab]})
                    </span>
                  </button>
                ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Filter
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                {(['upcoming', 'used'] as StatusFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background:
                        statusFilter === filter
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'transparent',
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    {filter === 'upcoming' ? 'Upcoming' : 'Used'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {renderContent()}
        </section>
      </main>
    </div>
  )
}

