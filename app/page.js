'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import NavbarPartyTix from "../components/NavbarPartyTix"
import EventCard from "../components/EventCard"
import { SkeletonGrid } from "../components/SkeletonCard"
import { hasSupabase } from "../lib/safeEnv"

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      if (hasSupabase()) {
        // 尝试从 Supabase 获取真实数据
        try {
          // 这里可以添加真实的 Supabase 查询
          // 暂时使用模拟数据
          await new Promise(resolve => setTimeout(resolve, 1000))
                  setEvents([
                    {
                      id: 1,
                      name: 'Ridiculous Chicken Night Event',
                      description: 'Enjoy delicious chicken and an amazing night',
                      start_date: '2025-10-25T20:00:00Z',
                      location: '201 N Main St SUITE A, Blacksburg, VA',
                      poster_url: null,
                      starting_price: 5000, // $50
                      status: 'active'
                    }
                  ])
        } catch (dbError) {
          console.log('Supabase 查询失败，使用模拟数据:', dbError)
          setEvents([])
        }
      } else {
        // Use mock data
        setEvents([
          {
            id: 1,
            name: 'Ridiculous Chicken Night Event',
            description: 'Enjoy delicious chicken and an amazing night',
            start_date: '2025-10-25T20:00:00Z',
            location: '201 N Main St SUITE A, Blacksburg, VA',
            poster_url: null,
            starting_price: 5000,
            status: 'active'
          }
        ])
      }
    } catch (err) {
      console.error('加载活动数据错误:', err)
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

