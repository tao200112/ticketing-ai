'use client'

import Link from "next/link"
import React, { useState, useEffect } from "react"
import NavbarPartyTix from "../components/NavbarPartyTix"
import EventCard from "../components/EventCard"
import { SkeletonGrid } from "../components/SkeletonCard"
import { hasSupabase } from "../lib/safeEnv"
import { getDefaultEvents } from "../lib/default-events"
import { useEvents } from "../lib/hooks/use-api"

export default function Home() {
  // 使用新的 API 钩子
  const { data: apiEvents, loading: apiLoading, error: apiError } = useEvents()
  const [localEvents, setLocalEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLocalEvents()
    
    // Listen to localStorage changes for real-time updates
    const handleStorageChange = (e) => {
      if (e.key === 'merchantEvents') {
        loadLocalEvents()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const loadLocalEvents = () => {
    try {
      // Load events created by merchants from local storage (fallback)
      let merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      
      // 清理有问题的 "aa" 活动
      merchantEvents = merchantEvents.filter(event => {
        const isAAEvent = event.title === 'aa' || 
                         event.id.includes('aa') ||
                         event.id.startsWith('default-aa-')
        
        if (isAAEvent) {
          console.log('🗑️ 自动清理有问题的活动:', event.title, event.id)
          return false
        }
        return true
      })
      
      // 保存清理后的数据
      if (merchantEvents.length !== JSON.parse(localStorage.getItem('merchantEvents') || '[]').length) {
        localStorage.setItem('merchantEvents', JSON.stringify(merchantEvents))
        console.log('✅ 已清理有问题的活动数据')
      }
      
      // Convert merchant event format to public event format
      const publicEvents = merchantEvents.map(event => ({
        id: event.id,
        name: event.title,
        description: event.description,
        start_date: event.startTime,
        location: event.location,
        poster_url: event.poster,
        starting_price: event.prices && event.prices.length > 0 ? 
          Math.min(...event.prices.map(p => p.amount_cents)) : 0,
        status: 'active',
        ticketsSold: event.ticketsSold || 0,
        totalTickets: event.totalTickets || 0,
        revenue: event.revenue || 0
      }))
      
      setLocalEvents(publicEvents)
    } catch (err) {
      console.error('Error loading local events:', err)
      setLocalEvents([])
    }
  }

  // 合并 API 数据和本地数据
  const events = React.useMemo(() => {
    const defaultEvents = getDefaultEvents()
    const allEvents = [...(apiEvents || []), ...localEvents, ...defaultEvents]
    return allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    )
  }, [apiEvents, localEvents])

  // 更新加载状态
  useEffect(() => {
    setLoading(apiLoading)
  }, [apiLoading])

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

