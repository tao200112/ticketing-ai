'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MerchantEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [merchantUser, setMerchantUser] = useState(null)

  useEffect(() => {
    // 检查商家登录状态
    const checkMerchantAuth = () => {
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      setMerchantUser(JSON.parse(user))
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
      const response = await fetch('/api/events')
      const result = await response.json()

      if (result.success && result.data) {
        // 过滤出当前商家的活动
        const merchantId = merchantUser.merchant_id || merchantUser.merchant?.id
        console.log('🔍 商家 ID:', merchantId)
        console.log('🔍 商家用户数据:', { id: merchantUser.id, merchant_id: merchantUser.merchant_id, merchant: merchantUser.merchant })
        console.log('🔍 所有活动数量:', result.data.length)
        
        let merchantEvents = []
        
        if (merchantId) {
          // 如果有 merchant_id，过滤出该商家的活动
          merchantEvents = result.data.filter(event => 
            event.merchant_id === merchantId
          )
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
      setError('加载事件失败')
      console.error('加载事件错误:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditEvent = async (eventId) => {
    // 简单的编辑功能：将活动状态改为 published 或 draft
    if (confirm('确定要修改这个事件吗？')) {
      try {
        // 获取当前事件信息
        const response = await fetch(`/api/events/${eventId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          const event = result.data
          // 切换状态
          const newStatus = event.status === 'published' ? 'draft' : 'published'
          
          // 更新事件
          const updateResponse = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...event,
              status: newStatus
            })
          })
          
          const updateResult = await updateResponse.json()
          
          if (updateResult.success) {
            loadEvents()
          } else {
            setError(updateResult.message || '更新事件失败')
          }
        }
      } catch (err) {
        setError('编辑事件失败')
        console.error('编辑事件错误:', err)
      }
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (confirm('确定要删除这个事件吗？')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          // 重新加载活动列表
          loadEvents()
        } else {
          setError(result.message || '删除事件失败')
        }
      } catch (err) {
        setError('删除事件失败')
        console.error('删除事件错误:', err)
      }
    }
  }

  const handleRefresh = () => {
    loadEvents()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <p style={{ color: '#6b7280' }}>加载事件中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <svg style={{ width: '3rem', height: '3rem', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            加载失败
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{error}</p>
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
            重试
          </button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>My Events</h1>
              <p style={{ color: '#4b5563', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>Manage your events and track performance</p>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              还没有事件
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              创建您的第一个事件来开始售票
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
              创建事件
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {events.map((event) => (
              <div key={event.id} style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '2rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                      {event.title}
                    </h3>
                    <p style={{ color: '#6b7280' }}>
                      {new Date(event.startTime).toLocaleDateString('zh-CN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {event.location}
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                          {event.ticketsSold || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Tickets Sold</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                          {event.totalTickets || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Total Tickets</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#059669', margin: 0 }}>
                          ${event.revenue || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Revenue</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => handleEditEvent(event.id)}
                      style={{
                        flex: 1,
                        backgroundColor: event.status === 'published' ? '#10b981' : '#2563eb',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = event.status === 'published' ? '#059669' : '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = event.status === 'published' ? '#10b981' : '#2563eb'}
                    >
                      {event.status === 'published' ? '发布中 (点击设为草稿)' : '草稿 (点击发布)'}
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