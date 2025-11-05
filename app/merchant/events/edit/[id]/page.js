'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      
      const userData = JSON.parse(user)
      setMerchantUser(userData)
      
      // 从API加载事件数据
      loadEventData(params.id, userData)
    }
    
    checkMerchantAuth()
  }, [params.id, router])

  const loadEventData = async (eventId, user) => {
    try {
      setLoading(true)
      setError('')
      
      // 从API获取事件数据
      const response = await fetch(`/api/events/${eventId}`)
      const result = await response.json()
      
      if (!result.success || !result.data) {
        setError('Event not found')
        setLoading(false)
        return
      }
      
      const event = result.data
      
      // 检查权限：只能编辑自己的事件
      const merchantId = user.merchant_id || user.merchant?.id
      if (merchantId && event.merchant_id !== merchantId) {
        setError('You do not have permission to edit this event')
        setLoading(false)
        return
      }
      
      // 转换数据格式以适配表单
      const formattedEvent = {
        title: event.title || '',
        description: event.description || '',
        startTime: event.start_at || event.startTime || '',
        endTime: event.end_at || event.endTime || '',
        location: event.venue_name || event.address || event.location || '',
        posterPreview: event.poster_url || null,
        prices: event.prices?.map(price => ({
          id: price.id,
          name: price.name || '',
          amount_cents: price.amount_cents ? (price.amount_cents / 100).toFixed(2) : '0.00',
          inventory: price.inventory || 0,
          limit_per_user: price.limit_per_user || 4
        })) || [{ name: '', amount_cents: '', inventory: '', limit_per_user: '' }]
      }
      
      setEventData(formattedEvent)
      setLoading(false)
    } catch (err) {
      setError('Failed to load event')
      console.error('Error loading event:', err)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setError('')
    
    try {
      // 验证必填字段
      if (!eventData.title || !eventData.description || !eventData.startTime || !eventData.endTime || !eventData.location) {
        setError('Please fill in all required fields')
        return
      }

      // 验证价格设置
      const validPrices = eventData.prices.filter(price => price.name && price.amount_cents && price.inventory)
      if (validPrices.length === 0) {
        setError('Please set at least one valid ticket type')
        return
      }

      // 验证价格是否符合 Stripe 最小金额要求
      const invalidPrices = validPrices.filter(price => parseFloat(price.amount_cents) < 0.50)
      if (invalidPrices.length > 0) {
        setError('All ticket prices must be at least $0.50 (Stripe minimum requirement)')
        return
      }

      // 调用API更新事件
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          poster_url: eventData.posterPreview,
          prices: validPrices.map(price => ({
            name: price.name,
            amount_cents: Math.round(parseFloat(price.amount_cents) * 100), // 将美元转换为分存储
            inventory: parseInt(price.inventory),
            limit_per_user: price.limit_per_user ? parseInt(price.limit_per_user) : 4
          }))
        })
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.message || 'Failed to update event')
        return
      }

      console.log('✅ Event updated successfully:', result.data)
      
      router.push('/merchant/events')
    } catch (err) {
      setError('Failed to save event, please try again')
      console.error('Error saving event:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateEventData = (field, value) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updatePriceData = (index, field, value) => {
    setEventData(prev => ({
      ...prev,
      prices: prev.prices.map((price, i) => 
        i === index ? { ...price, [field]: value } : price
      )
    }))
  }

  const addPrice = () => {
    setEventData(prev => ({
      ...prev,
      prices: [...prev.prices, { name: '', amount_cents: '', inventory: '', limit_per_user: '' }]
    }))
  }

  const removePrice = (index) => {
    if (eventData.prices.length > 1) {
      setEventData(prev => ({
        ...prev,
        prices: prev.prices.filter((_, i) => i !== index)
      }))
    }
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

  if (error && !eventData) {
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
            onClick={() => router.back()}
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
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navigation Bar */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#4b5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Edit Event</h1>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Update your event details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Form Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>Event Information</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventData?.title || ''}
                    onChange={(e) => updateEventData('title', e.target.value)}
                    placeholder="Enter event title"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      color: '#111827',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Event Description *
                  </label>
                  <textarea
                    value={eventData?.description || ''}
                    onChange={(e) => updateEventData('description', e.target.value)}
                    placeholder="Describe your event in detail"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      color: '#111827',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventData?.startTime || ''}
                      onChange={(e) => updateEventData('startTime', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        color: '#111827',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventData?.endTime || ''}
                      onChange={(e) => updateEventData('endTime', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        color: '#111827',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Event Location *
                  </label>
                  <input
                    type="text"
                    value={eventData?.location || ''}
                    onChange={(e) => updateEventData('location', e.target.value)}
                    placeholder="Enter event location"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      color: '#111827',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Ticket Settings */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>Ticket Settings</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {eventData?.prices?.map((price, index) => (
                  <div key={index} style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#111827', margin: 0 }}>Ticket Type {index + 1}</h3>
                      {eventData.prices.length > 1 && (
                        <button
                          onClick={() => removePrice(index)}
                          style={{
                            color: '#dc2626',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#b91c1c'}
                          onMouseLeave={(e) => e.target.style.color = '#dc2626'}
                        >
                          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          Ticket Name *
                        </label>
                        <input
                          type="text"
                          value={price.name}
                          onChange={(e) => updatePriceData(index, 'name', e.target.value)}
                          placeholder="e.g.: Early Bird, VIP"
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            color: '#111827',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb'
                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          Price ($) * (Minimum: $0.50)
                        </label>
                        <input
                          type="number"
                          value={price.amount_cents}
                          onChange={(e) => updatePriceData(index, 'amount_cents', e.target.value)}
                          placeholder="0.50"
                          min="0.50"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            color: '#111827',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb'
                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          Stock Quantity *
                        </label>
                        <input
                          type="number"
                          value={price.inventory}
                          onChange={(e) => updatePriceData(index, 'inventory', e.target.value)}
                          placeholder="0"
                          min="0"
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            color: '#111827',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb'
                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          Limit Per User
                        </label>
                        <input
                          type="number"
                          value={price.limit_per_user}
                          onChange={(e) => updatePriceData(index, 'limit_per_user', e.target.value)}
                          placeholder="4"
                          min="1"
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            color: '#111827',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb'
                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addPrice}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb'
                    e.target.style.borderColor = '#9ca3af'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6'
                    e.target.style.borderColor = '#d1d5db'
                  }}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Ticket Type
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span style={{ color: '#b91c1c' }}>{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: isSubmitting ? '#f3f4f6' : '#2563eb',
                color: isSubmitting ? '#9ca3af' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = '#1d4ed8'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.backgroundColor = '#2563eb'
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid #9ca3af',
                    borderTop: '2px solid #6b7280',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
