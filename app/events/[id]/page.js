'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '../../../components/AuthGuard'

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAge, setCustomerAge] = useState('')

  useEffect(() => {
    if (id) {
      loadEventData()
      loadUserData()
    }
  }, [id])

  const loadEventData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/events/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        setEvent(result.data)
        if (result.data.prices && result.data.prices.length > 0) {
          setSelectedPrice(result.data.prices[0].id)
        }
      } else {
        setError('Event not found')
      }
    } catch (error) {
      console.error('加载活动失败:', error)
      setError('Failed to load event, please try again')
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async () => {
    try {
      // Get user info from Supabase Auth session - use browser singleton
      if (typeof window !== 'undefined') {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabaseClient = getSupabaseBrowser()
        // Use getUser() for security - authenticates user by contacting Supabase Auth server
        const { data: { user }, error } = await supabaseClient.auth.getUser()
        
        if (user && !error) {
          setCustomerEmail(user.email || '')
          setCustomerName(user.user_metadata?.full_name || user.user_metadata?.name || user.email || '')
          if (user.user_metadata?.age) {
            setCustomerAge(String(user.user_metadata.age))
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load user session:', error)
    }
  }

  const handleBuyTickets = async () => {
    if (!selectedPrice) {
      setError('Please select a ticket type')
      return
    }

    if (!customerEmail || !customerName) {
      setError('Please fill in email and name')
      return
    }
    
    if (!customerAge || parseInt(customerAge) < 1 || parseInt(customerAge) > 120) {
      setError('Please enter a valid age (1-120)')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Note: API now gets identity from session automatically
      // No need to pass userId in body

      const priceData = event.prices.find(p => p.id === selectedPrice)
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          price_id: selectedPrice,
          quantity: quantity,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_age: parseInt(customerAge),
          // userId removed - API now gets identity from session
        }),
      })

      const result = await response.json()

      // 检查响应状态码
      if (response.status === 401) {
        // 用户未登录，立即重定向到登录页面（不延迟）
        console.error('[handleBuyTickets] Unauthorized when creating checkout session', {
          status: response.status,
          error: result.error || result.message,
          url: window.location.pathname
        })
        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
        return
      }

      if (!response.ok) {
        // 其他错误
        const errorMessage = result.message || result.error || 'Failed to create payment session'
        console.error('[handleBuyTickets] API error:', {
          status: response.status,
          error: errorMessage,
          result
        })
        setError(errorMessage)
        return
      }

      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        setError(result.message || 'Failed to create payment session')
      }
    } catch (error) {
      console.error('购买失败:', error)
      setError('Purchase failed, please try again')
    } finally {
      setLoading(false)
    }
  }

  // 加载状态
  if (loading) {
    return (
      <AuthGuard>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
          padding: '80px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(124, 58, 237, 0.3)',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: 'white', fontSize: '1.125rem' }}>Loading...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // 错误状态
  if (error && !event) {
    return (
      <AuthGuard>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
          padding: '80px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: '16px' }}>{error}</h2>
            <Link href="/events" style={{
              color: '#7c3aed',
              marginTop: '16px',
              display: 'inline-block',
              textDecoration: 'none'
            }}>
              ← Back to Events
            </Link>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!event) return null

  const selectedPriceData = event.prices?.find(p => p.id === selectedPrice)
  const totalPrice = selectedPriceData ? (selectedPriceData.amount_cents / 100 * quantity).toFixed(2) : '0.00'

  return (
    <AuthGuard>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        padding: '32px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* 返回按钮 */}
          <div style={{ marginBottom: '24px' }}>
            <Link href="/events" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#22D3EE',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              ← Back to Events
            </Link>
          </div>

          {/* 活动详情 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>
              {event.title || event.name}
            </h1>

            <p style={{
              color: '#cbd5e1',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              {event.description}
            </p>

            {/* 活动详细信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {event.start_at && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>📅</div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Event Time</div>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {new Date(event.start_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              )}

              {(event.address || event.venue_name) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>📍</div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Venue</div>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {event.venue_name || event.address}
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem' }}>⏱️</div>
                <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Ticket Validity</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>Same day 4:00 PM - Next day 3:00 AM</div>
                </div>
              </div>
            </div>

            {event.merchants && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <div style={{ fontSize: '1.5rem' }}>🏢</div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Organizer</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>{event.merchants.name}</div>
                </div>
              </div>
            )}
          </div>

          {/* 购票区域 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '24px'
            }}>
              Purchase Tickets
            </h2>

            {/* 错误信息 */}
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#ef4444',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            {/* 票种选择 */}
            {event.prices && event.prices.length > 0 ? (
              <>
                <div style={{ marginBottom: '24px' }}>
                  {event.prices.map((price) => (
                    <div key={price.id} style={{
                      marginBottom: '16px',
                      padding: '16px',
                      backgroundColor: selectedPrice === price.id ? 'rgba(124, 58, 237, 0.2)' : 'rgba(55, 65, 81, 0.3)',
                      border: selectedPrice === price.id ? '2px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setSelectedPrice(price.id)}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 'bold',
                            color: 'white',
                            marginBottom: '4px'
                          }}>
                            {price.name}
                          </h3>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: '#22c55e'
                            }}>
                              ${(price.amount_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                            Stock: {price.inventory}
                          </div>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: selectedPrice === price.id ? '2px solid #7c3aed' : '2px solid #6b7280',
                            backgroundColor: selectedPrice === price.id ? '#7c3aed' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {selectedPrice === price.id && (
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'white'
                              }}></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 客户信息 */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    color: 'white',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: '16px'
                  }}>
                    Customer Information
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'rgba(55, 65, 81, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '1rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{
                        display: 'block',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        readOnly
                        placeholder="Account email (auto-filled)"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: 'rgba(55, 65, 81, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: customerEmail ? 'white' : '#94a3b8',
                          fontSize: '1rem',
                          outline: 'none',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      Age *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customerAge}
                      onChange={(e) => setCustomerAge(e.target.value)}
                      placeholder="Enter your age"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  {/* 重要提示信息 */}
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{
                        color: '#ef4444',
                        fontSize: '1.25rem',
                        marginTop: '2px',
                        fontWeight: 'bold'
                      }}>
                        ⚠️
                      </div>
                      <div style={{
                        color: '#fca5a5',
                        fontSize: '0.9375rem',
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        <div style={{ 
                          color: '#fecaca', 
                          fontWeight: 'bold', 
                          marginBottom: '8px',
                          fontSize: '1rem'
                        }}>
                          Important Notice: ID Verification Required for Entry
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          • You must present a valid ID for verification at entry
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          • The <strong style={{ color: '#fecaca' }}>name and age</strong> you provide when purchasing must <strong style={{ color: '#fecaca' }}>exactly match</strong> your ID document
                        </div>
                        <div style={{ 
                          color: '#fee2e2', 
                          fontWeight: 'bold',
                          marginTop: '8px',
                          fontSize: '0.9375rem'
                        }}>
                          ⚠️ If information does not match, the ticket will be voided with no refund
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 数量选择 */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '8px'
                  }}>
                    Quantity
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num} ticket{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* 总价 */}
                <div style={{
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: '#94a3b8' }}>Total</span>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#22c55e'
                    }}>
                      ${totalPrice}
                    </span>
                  </div>
                  <div style={{
                    color: 'rgba(239, 68, 68, 0.9)',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    ⚠️ Tickets are non-refundable once purchased
                  </div>
                </div>

                {/* 购买按钮 */}
                <button
                  onClick={handleBuyTickets}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: loading ? '#6b7280' : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? 'Processing...' : 'Purchase Now'}
                </button>
              </>
            ) : (
              <p style={{ color: '#94a3b8' }}>No tickets available</p>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AuthGuard>
  )
}
