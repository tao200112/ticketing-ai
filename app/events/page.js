'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import EventCard from '../../components/EventCard'
import { getDefaultEvents } from '../../lib/default-events'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return
    
    loadEvents()
    
    // 监听localStorage变化，当商家创建新事件时自动刷新
    const handleStorageChange = (e) => {
      if (e.key === 'merchantEvents') {
        loadEvents()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 只在窗口获得焦点时检查更新
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
      
      // 从本地存储加载商家创建的事件 (fallback)
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
      
      // Combine and deduplicate events (database events take priority)
      const defaultEvents = getDefaultEvents()
      const allEvents = [...dbEvents, ...publicEvents, ...defaultEvents]
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      )
      
      setEvents(uniqueEvents)
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
