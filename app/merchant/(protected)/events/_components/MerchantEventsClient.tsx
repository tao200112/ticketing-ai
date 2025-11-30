'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'
import type { MerchantProfile } from '@/lib/auth/getMerchant'

type MerchantEventsClientProps = {
  merchant: MerchantProfile
}

type MerchantEvent = {
  id: string
  title?: string
  description?: string
  startTime?: string
  start_at?: string
  venue_name?: string
  address?: string
  location?: string
  ticketsSold?: number
  totalTickets?: number
  revenue?: number | string
  status?: string
  region?: string | null
  merchant_id?: string
}

export default function MerchantEventsClient({ merchant }: MerchantEventsClientProps) {
  const router = useRouter()
  const [events, setEvents] = useState<MerchantEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const merchantRegionSlug = merchant.region || merchant.region_slug || null

  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true)
      setEventsError(null)
      const eventsEndpoint = merchantRegionSlug
        ? `/api/events?region=${encodeURIComponent(merchantRegionSlug)}`
        : '/api/events'
      const response = await fetch(eventsEndpoint, { cache: 'no-store' })
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const merchantEvents = (result.data as MerchantEvent[]).filter((event) => {
          const matchesMerchant = event.merchant_id === merchant.id
          const matchesRegion = merchantRegionSlug ? event.region === merchantRegionSlug : true
          return matchesMerchant && matchesRegion
        })
        setEvents(merchantEvents)
      } else {
        setEvents([])
        setEventsError(result.error || result.message || 'Failed to load events')
      }
    } catch (error) {
      console.error('[MerchantEventsClient] Failed to load events', error)
      setEvents([])
      setEventsError('Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }, [merchant.id, merchantRegionSlug])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!eventId || deletingId) {
        return
      }

      const confirmed = window.confirm('Are you sure you want to delete this event?')
      if (!confirmed) {
        return
      }

      try {
        setDeletingId(eventId)
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
        })
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || result.message || 'Failed to delete event')
        }
        await loadEvents()
      } catch (error) {
        console.error('[MerchantEventsClient] Failed to delete event', error)
        alert('Failed to delete event, please try again.')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId, loadEvents],
  )

  const handleEditEvent = (eventId: string) => {
    router.push(`/merchant/events/edit/${eventId}`)
  }

  const handleCreateEvent = () => {
    router.push('/merchant/events/new')
  }

  const isBusy = eventsLoading

  const emptyStateMessage = useMemo(() => {
    if (!merchantRegionSlug) {
      return 'Your merchant profile is missing a region assignment. Please contact an administrator.'
    }
    return 'Create your first event to start selling tickets.'
  }, [merchantRegionSlug])

  if (!merchant) {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      }}
    >
      <MerchantNavbar />
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '100px 2rem 2rem 2rem' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
              My Events
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
              Manage events for {merchant.name || merchant.email}
            </p>
            {merchantRegionSlug && (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                Assigned region: {merchantRegionSlug}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={loadEvents}
              disabled={isBusy}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: isBusy ? 'not-allowed' : 'pointer',
              }}
            >
              {isBusy ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={handleCreateEvent}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create Event
            </button>
          </div>
        </header>

        {eventsError && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(248,113,113,0.6)',
              color: '#fecaca',
              background: 'rgba(248,113,113,0.15)',
            }}
          >
            {eventsError}
          </div>
        )}

        {isBusy ? (
          <div
            style={{
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            Loading events…
          </div>
        ) : events.length === 0 ? (
          <div
            style={{
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.85)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No events yet</p>
            <p style={{ marginBottom: '1.5rem' }}>{emptyStateMessage}</p>
            <button
              onClick={handleCreateEvent}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create Event
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                      {event.title || 'Untitled Event'}
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.65)', margin: 0, fontSize: '0.95rem' }}>
                      {formatEventDate(event)} • {event.location || event.venue_name || event.address || 'Location TBA'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleEditEvent(event.id)}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={deletingId === event.id}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: deletingId === event.id ? 'not-allowed' : 'pointer',
                        opacity: deletingId === event.id ? 0.7 : 1,
                      }}
                    >
                      {deletingId === event.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '1rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <Metric label="Tickets Sold" value={event.ticketsSold ?? 0} />
                  <Metric label="Total Tickets" value={event.totalTickets ?? 0} />
                  <Metric label="Revenue" value={`$${event.revenue ?? 0}`} accent />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'rgba(255, 255, 255, 0.6)' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 600, color: accent ? '#22c55e' : 'white', margin: 0 }}>{value}</p>
    </div>
  )
}

function formatEventDate(event: MerchantEvent) {
  const rawDate = event.startTime || event.start_at
  if (!rawDate) {
    return 'Date TBD'
  }
  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) {
    return 'Date TBD'
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}


