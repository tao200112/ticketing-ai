'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import NavbarPartyTix from "../components/NavbarPartyTix"
import EventCard from "../components/EventCard"
import { SkeletonGrid } from "../components/SkeletonCard"
import { hasSupabase } from "../lib/safeEnv"
import { getDefaultEvents } from "../lib/default-events"

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
    
    // Listen to localStorage changes for real-time updates
    const handleStorageChange = (e) => {
      // Only reload if merchantEvents changed
      if (e.key === 'merchantEvents') {
        loadEvents()
      }
    }
    
    // Listen to storage events
    window.addEventListener('storage', handleStorageChange)
    
    // Remove the aggressive polling - only check on focus
    const handleFocus = () => {
      loadEvents()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      // Load events from database first
      let dbEvents = []
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          // 处理不同的数据格式
          if (Array.isArray(data)) {
            dbEvents = data
          } else if (data && data.data && Array.isArray(data.data)) {
            dbEvents = data.data
          } else if (data && data.ok && data.data && Array.isArray(data.data)) {
            dbEvents = data.data
          }
        }
      } catch (error) {
        console.error('Failed to load events from database:', error)
      }
      
      // Load events created by merchants from local storage (fallback)
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      
      // Convert merchant event format to public event format
      const publicEvents = merchantEvents.map(event => ({
        id: event.id,
        name: event.title,
        description: event.description,
        start_date: event.startTime,
        location: event.location,
        poster_url: event.poster,
        starting_price: event.prices && event.prices.length > 0 ? 
          Math.min(...event.prices.map(p => p.amount_cents * 100)) : 0, // Convert to cents
        status: 'active',
        ticketsSold: event.ticketsSold || 0,
        totalTickets: event.totalTickets || 0,
        revenue: event.revenue || 0
      }))
      
      // Combine and deduplicate events (database events take priority)
      const defaultEvents = getDefaultEvents()
      const allEvents = [...dbEvents, ...publicEvents, ...defaultEvents]
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      )
      
      setEvents(uniqueEvents)
    } catch (err) {
      console.error('Error loading event data:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      <NavbarPartyTix />
      
      {/* Hero Section */}
      <div style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            Welcome to <span className="text-partytix-gradient">PartyTix</span>
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#cbd5e1', 
            marginBottom: '32px', 
            maxWidth: '600px', 
            margin: '0 auto 32px auto',
            lineHeight: '1.6'
          }}>
            Discover amazing events, buy tickets, and enjoy unforgettable experiences. From concerts to food festivals, everything is on PartyTix.
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Link href="/events" className="btn-partytix-gradient">
              Browse Events
            </Link>
            <Link href="/auth/register" style={{
              padding: '12px 24px',
              backgroundColor: '#374151',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'background-color 0.3s'
            }}>
              Register Account
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <div style={{ paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '32px', 
            textAlign: 'center' 
          }}>
            Featured Events
          </h2>

          {loading ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '300px',
                  backgroundColor: '#374151',
                  borderRadius: '12px',
                  animation: 'pulse 2s infinite'
                }}></div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎪</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                No Events Available
              </h3>
              <p style={{ color: '#94a3b8' }}>Stay tuned for more exciting events</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/events" className="btn-partytix-gradient">
              View All Events
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}

