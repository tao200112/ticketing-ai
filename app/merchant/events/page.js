'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'

export default function MerchantEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [merchantUser, setMerchantUser] = useState(null)

  useEffect(() => {
    // 检查商家登录状态 - 使用 Supabase Auth
    const checkMerchantAuth = async () => {
      try {
        // 检查 Supabase Auth 会话
        const response = await fetch('/api/merchant/profile', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          // 未登录或不是商家，跳转到登录页
          router.push('/merchant/auth/login?next=/merchant/events')
          return
        }
        
        const data = await response.json()
        if (data.success && data.merchant) {
          const inferredRegionId = data.merchant.region_id || data.merchant.region?.id || null
          setMerchantUser({
            id: data.merchant.id,
            email: data.merchant.email,
            name: data.merchant.name,
            merchant_id: data.merchant.id,
            region_id: inferredRegionId,
            region_slug: data.merchant.region?.slug || null
          })
        } else {
          router.push('/merchant/auth/login?next=/merchant/events')
        }
      } catch (err) {
        console.error('Error checking merchant auth:', err)
        router.push('/merchant/auth/login?next=/merchant/events')
      }
    }
    
    checkMerchantAuth()
  }, [router])

  useEffect(() => {
    if (merchantUser) {
      loadEvents()
    }
  }, [merchantUser])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      if (!merchantUser) {
        setEvents([])
        return
      }
      
      // 从 API 加载活动
      const eventsEndpoint =
        merchantUser.region_slug
          ? `/api/events?region=${encodeURIComponent(merchantUser.region_slug)}`
          : '/api/events'
      const response = await fetch(eventsEndpoint)
      const result = await response.json()

      if (result.success && result.data) {
        // 过滤出当前商家的活动
        const merchantId = merchantUser.merchant_id || merchantUser.id
        console.log('🔍 商家 ID:', merchantId)
        console.log('🔍 商家用户数据:', { id: merchantUser.id, merchant_id: merchantUser.merchant_id })
        console.log('🔍 所有活动数量:', result.data.length)
        
        let merchantEvents = []
        
        if (merchantId) {
          // 如果有 merchant_id，过滤出该商家的活动，同时确保区域一致
          merchantEvents = result.data.filter(event => {
            const matchesMerchant = event.merchant_id === merchantId
            const matchesRegion = merchantUser.region_id ? event.region_id === merchantUser.region_id : true
            return matchesMerchant && matchesRegion
          })
        } else {
          // 如果没有 merchant_id，显示所有活动（临时方案）
          merchantEvents = result.data
          console.warn('⚠️ 未找到 merchant_id，显示所有活动')
        }
        
        console.log('✅ 匹配的活动数量:', merchantEvents.length)
        setEvents(merchantEvents)
      } else {
        setEvents([])
      }
    } catch (err) {
        setError('Failed to load events')
        console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditEvent = (eventId) => {
    // 跳转到编辑页面
    router.push(`/merchant/events/edit/${eventId}`)
  }

  const handleDeleteEvent = async (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          // 重新加载活动列表
          loadEvents()
        } else {
          setError(result.message || 'Failed to delete event')
        }
      } catch (err) {
        setError('Failed to delete event')
        console.error('Error deleting event:', err)
      }
    }
  }

  const handleRefresh = () => {
    loadEvents()
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid #f3f4f6',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <svg style={{ width: '3rem', height: '3rem', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Loading Failed
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem' }}>{error}</p>
          <button 
            onClick={loadEvents}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      <MerchantNavbar />
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '100px 2rem 2rem 2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>My Events</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>Manage your events and track performance</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleRefresh}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => window.location.href = '/merchant/events/new'}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Event
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{
              width: '6rem',
              height: '6rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem auto'
            }}>
              <svg style={{ width: '3rem', height: '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
              No events yet
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Create your first event to start selling tickets
            </p>
            <button
              onClick={() => router.push('/merchant/events/new')}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              Create Event
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {events.map((event) => (
              <div key={event.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                borderRadius: '0.5rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '2rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                      {event.title}
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {event.startTime || event.start_at ? (
                        new Date(event.startTime || event.start_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : 'Date TBD'} • {event.location || event.venue_name || event.address || 'Location TBD'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                          {event.ticketsSold || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0.25rem 0 0 0' }}>Tickets Sold</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                          {event.totalTickets || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0.25rem 0 0 0' }}>Total Tickets</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#22c55e', margin: 0 }}>
                          ${event.revenue || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0.25rem 0 0 0' }}>Revenue</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => handleEditEvent(event.id)}
                      style={{
                        flex: 1,
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      style={{
                        flex: 1,
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                    >
                      Delete Event
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}