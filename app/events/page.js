'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import EventCard from '@/components/events/EventCard'
import { useEvents } from '../../lib/hooks/use-api'
import { useDefaultRegionSlug } from '@/hooks/use-default-region-slug'

export default function EventsPage() {
  // 使用新的 API 钩子
  const { data: apiEvents, loading: apiLoading, error: apiError } = useEvents()
  const [localEvents, setLocalEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const defaultRegionSlug = useDefaultRegionSlug()

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return
    
    loadLocalEvents()
    
    // 监听localStorage变化，当商家创建新事件时自动刷新
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
      
      setLocalEvents(publicEvents)
    } catch (err) {
      console.error('加载本地活动数据错误:', err)
      setLocalEvents([])
    }
  }

  // 合并 API 数据和本地数据
  const events = React.useMemo(() => {
    console.log('🔍 开始合并活动数据:', { apiEvents, apiLoading, apiError })
    
    // 使用 API 返回的活动数据和默认活动
    let allEvents = []
    
    // 添加 API 活动
    if (apiEvents && Array.isArray(apiEvents) && apiEvents.length > 0) {
      console.log('✅ 添加 API 活动:', apiEvents.length)
      allEvents = [...apiEvents]
    } else {
      console.log('⚠️ API 活动为空或无效:', apiEvents)
    }
    
    
    // 过滤掉测试活动
    const filteredEvents = allEvents.filter(event => {
      const title = event.title || event.name || ''
      return title.length > 1 && title !== '11' && title !== 'bb' && title !== 'aa'
    })
    
    console.log(`📊 活动统计 - API: ${apiEvents?.length || 0}, Local: ${localEvents.length}, 最终: ${filteredEvents.length}`)
    
    return filteredEvents
  }, [apiEvents, apiLoading, apiError]) // 添加更多依赖项确保数据更新

  // 更新加载状态 - 改进loading逻辑
  useEffect(() => {
    if (apiLoading) {
      setLoading(true)
    } else {
      // 延迟一点时间确保数据完全加载
      const timer = setTimeout(() => {
        setLoading(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [apiLoading])

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
          <Link href={`/${defaultRegionSlug}`} style={{
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
