'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import EventCard from '../../components/EventCard'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
    
    // 监听localStorage变化，当商家创建新事件时自动刷新
    const handleStorageChange = (e) => {
      if (e.key === 'merchantEvents') {
        loadEvents()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 定期检查localStorage变化（用于同一窗口内的变化）
    const interval = setInterval(() => {
      const currentEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      if (currentEvents.length !== events.length) {
        loadEvents()
      }
    }, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [events.length])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      // 从本地存储加载商家创建的事件
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      
      // 转换商家事件格式为公共事件格式
      const publicEvents = merchantEvents.map(event => ({
        id: event.id,
        name: event.title,
        description: event.description,
        start_date: event.startTime,
        location: event.location,
        poster_url: event.poster,
        starting_price: event.prices && event.prices.length > 0 ? 
          Math.min(...event.prices.map(p => p.amount_cents)) : 0, // 已经是分为单位
        status: 'active',
        ticketsSold: event.ticketsSold || 0,
        totalTickets: event.totalTickets || 0,
        revenue: event.revenue || 0
      }))
      
      // 如果没有商家事件，显示默认事件
      if (publicEvents.length === 0) {
        setEvents([
          {
            id: 'default-1',
            name: 'Ridiculous Chicken Night Event',
            description: 'Enjoy delicious chicken and an amazing night, the most popular event near Virginia Tech',
            start_date: '2025-10-25T20:00:00Z',
            location: '201 N Main St SUITE A, Blacksburg, VA',
            poster_url: null,
            starting_price: 5000, // $50
            status: 'active'
          }
        ])
      } else {
        setEvents(publicEvents)
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
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>
            Amazing Events
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Discover and participate in various exciting events
          </p>
        </div>

        {/* 活动列表 */}
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

        {/* 返回首页 */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#374151',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '600',
            textDecoration: 'none',
            transition: 'background-color 0.3s'
          }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
