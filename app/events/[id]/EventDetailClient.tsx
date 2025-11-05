'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { EventDetail, Price } from '../../../lib/schemas/event'
import { EventDetailErrorBoundary } from '../../../components/ErrorBoundary'

interface EventDetailClientProps {
  event: EventDetail
}

/**
 * 🎫 事件详情客户端组件
 * 处理用户交互和客户端状态管理
 */
export default function EventDetailClient({ event }: EventDetailClientProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(0)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAge, setCustomerAge] = useState('')
  const [ticketValidityDate, setTicketValidityDate] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // 安全获取用户数据 - 确保只在客户端执行
  useEffect(() => {
    // 检查是否在客户端环境
    if (typeof window === 'undefined') return
    
    try {
      const userSession = localStorage.getItem('userSession')
      if (userSession) {
        const user = JSON.parse(userSession)
        if (user?.id) {
          setCustomerEmail(user.email ?? '')
          setCustomerName(user.name ?? '')
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }, [])

  // 安全获取选中的价格
  const selectedPrice: Price | null = event?.prices?.[selectedPriceIndex] ?? null
  const totalPrice = selectedPrice ? (selectedPrice.amount * quantity) / 100 : 0

  const handleBuyTickets = async () => {
    // 验证用户登录状态 - 确保只在客户端执行
    if (typeof window === 'undefined') {
      setPaymentError('Page is loading, please try again later')
      return
    }

    try {
      const userSession = localStorage.getItem('userSession')
      if (!userSession) {
        setPaymentError('Please login first to purchase tickets')
        return
      }

      const user = JSON.parse(userSession)
      if (!user?.id) {
        setPaymentError('Please login first to purchase tickets')
        return
      }
    } catch (error) {
      console.error('Failed to verify user login status:', error)
      setPaymentError('Please login first to purchase tickets')
      return
    }

    // 验证表单数据
    if (!customerEmail || !customerName) {
      setPaymentError('Please fill in email and name')
      return
    }
    
    if (!customerAge || parseInt(customerAge) < 1 || parseInt(customerAge) > 120) {
      setPaymentError('Please enter a valid age (1-120)')
      return
    }

    if (!ticketValidityDate) {
      setPaymentError('Please select ticket validity date')
      return
    }

    if (!selectedPrice) {
      setPaymentError('Please select a ticket type')
      return
    }

    if (selectedPrice.inventory && selectedPrice.inventory < quantity) {
      setPaymentError('Insufficient ticket inventory')
      return
    }

    setPaymentLoading(true)
    setPaymentError('')

    try {
      // 计算票券有效期时间
      const validityStartTime = new Date(ticketValidityDate)
      validityStartTime.setHours(16, 0, 0, 0) // 16:00
      
      const validityEndTime = new Date(ticketValidityDate)
      validityEndTime.setDate(validityEndTime.getDate() + 1)
      validityEndTime.setHours(2, 0, 0, 0) // 次日 02:00

      // 获取用户信息 - 确保只在客户端执行
      let user = null
      if (typeof window !== 'undefined') {
        try {
          const userSession = localStorage.getItem('userSession')
          user = userSession ? JSON.parse(userSession) : null
        } catch (error) {
          console.error('Failed to get user information:', error)
        }
      }

      // 创建 Stripe 结账会话
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketType: selectedPrice.label,
          quantity: quantity,
          customerEmail: customerEmail,
          customerName: customerName,
          customerAge: parseInt(customerAge),
          userId: user?.id,
          userToken: user?.token ?? 'local-token',
          ticketValidityDate: ticketValidityDate,
          ticketValidityStart: validityStartTime.toISOString(),
          ticketValidityEnd: validityEndTime.toISOString(),
          eventData: event
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 保存购买信息到 localStorage - 确保只在客户端执行
        if (typeof window !== 'undefined') {
          try {
            const purchaseInfo = {
              eventId: event.id,
              eventTitle: event.title,
              ticketType: selectedPrice.label,
              quantity: quantity,
              totalAmount: selectedPrice.amount * quantity,
              customerEmail: customerEmail,
              customerName: customerName,
              customerAge: parseInt(customerAge),
              ticketValidityDate: ticketValidityDate,
              ticketValidityStart: validityStartTime.toISOString(),
              ticketValidityEnd: validityEndTime.toISOString()
            }
            localStorage.setItem('recentPurchase', JSON.stringify(purchaseInfo))
          } catch (error) {
            console.error('Failed to save purchase information:', error)
          }
        }
        
        // 跳转到 Stripe 结账页面 - 确保只在客户端执行
        if (typeof window !== 'undefined') {
          window.location.href = data.url
        }
      } else {
        setPaymentError(`Payment setup failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentError('Payment setup failed, please try again')
    } finally {
      setPaymentLoading(false)
    }
  }

  return (
    <EventDetailErrorBoundary>
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
              {event?.title ?? 'Event Title'}
            </h1>

            <p style={{
              color: '#cbd5e1',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              {event?.description ?? 'No description available'}
            </p>

            {/* 活动信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
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
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Start Time</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>
                    {event?.start_time ? new Date(event.start_time).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'TBD'}
                  </div>
                </div>
              </div>

              {event?.end_time && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>🕐</div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>End Time</div>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {new Date(event.end_time).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
                <div style={{ fontSize: '1.5rem' }}>📍</div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Venue</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>
                    {event?.venue ?? event?.location ?? 'TBD'}
                  </div>
                </div>
              </div>

              {event?.max_attendees && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>👥</div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Max Attendees</div>
                    <div style={{ color: 'white', fontWeight: '500' }}>
                      {event.max_attendees} people
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 购票区域 */}
          {event?.prices && event.prices.length > 0 ? (
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
                Select Ticket Type
              </h2>

              {/* 票种选择 */}
              <div style={{ marginBottom: '24px' }}>
                {event.prices.map((price, index) => (
                  <div key={price.id} style={{
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: selectedPriceIndex === index ? 'rgba(124, 58, 237, 0.2)' : 'rgba(55, 65, 81, 0.3)',
                    border: selectedPriceIndex === index ? '2px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSelectedPriceIndex(index)}>
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
                          {price.label}
                        </h3>
                        {price.inventory && (
                          <p style={{
                            color: '#94a3b8',
                            fontSize: '0.875rem',
                            marginBottom: '8px'
                          }}>
                            Stock: {price.inventory} tickets
                          </p>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: '#22c55e'
                          }}>
                            ${(price.amount / 100).toFixed(2)}
                          </span>
                          {price.limit_per_user && (
                            <span style={{
                              fontSize: '0.875rem',
                              color: '#6b7280'
                            }}>
                              (Limit {price.limit_per_user} per person)
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: selectedPriceIndex === index ? '2px solid #7c3aed' : '2px solid #6b7280',
                        backgroundColor: selectedPriceIndex === index ? '#7c3aed' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selectedPriceIndex === index && (
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
              </div>

              {/* 票券有效期选择 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Select Ticket Validity Date *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      marginBottom: '4px'
                    }}>
                      Ticket Date
                    </label>
                    <input
                      type="date"
                      value={ticketValidityDate}
                      onChange={(e) => setTicketValidityDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
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
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      marginBottom: '4px'
                    }}>
                      Validity Time
                    </label>
                    <div style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(55, 65, 81, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#6b7280',
                      fontSize: '1rem',
                      cursor: 'not-allowed'
                    }}>
                      4:00 PM - Next day 2:00 AM
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#6ee7b7'
                }}>
                  ℹ️ Ticket validity is from 4:00 PM on the selected date to 2:00 AM the next day. Please use within the validity period.
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
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} ticket(s)</option>
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
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#94a3b8' }}>Total</span>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#22c55e'
                  }}>
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 错误信息 */}
              {paymentError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#ef4444',
                  fontSize: '0.875rem'
                }}>
                  {paymentError}
                </div>
              )}

              {/* 购票按钮 */}
              <button
                onClick={handleBuyTickets}
                disabled={paymentLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: paymentLoading ? '#6b7280' : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  cursor: paymentLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!paymentLoading) {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!paymentLoading) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                {paymentLoading ? 'Processing...' : 'Purchase Now'}
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎫</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                No Tickets Available
              </h3>
              <p style={{ color: '#94a3b8' }}>
                No tickets are available for this event at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </EventDetailErrorBoundary>
  )
}
