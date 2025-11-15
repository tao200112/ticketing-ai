'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { EventDetail, Price } from '../../../lib/schemas/event'
import { EventDetailErrorBoundary } from '../../../components/ErrorBoundary'
import { getTicketCategory, requires21Plus, isComboTicket } from '../../../lib/ticket-helpers'

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
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // 安全获取用户数据 - 确保只在客户端执行
  useEffect(() => {
    // 检查是否在客户端环境
    if (typeof window === 'undefined') return
    
    // Get user info from Supabase Auth session - use browser singleton
    try {
      if (typeof window !== 'undefined') {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabaseClient = getSupabaseBrowser()
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (session?.user) {
          setCustomerEmail(session.user.email ?? '')
          setCustomerName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email ?? '')
          if (session.user.user_metadata?.age) {
            setCustomerAge(String(session.user.user_metadata.age))
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }, [])

  // 安全获取选中的价格
  const selectedPrice: Price | null = event?.prices?.[selectedPriceIndex] ?? null
  const totalPrice = selectedPrice ? (selectedPrice.amount * quantity) / 100 : 0

  // 按分类组织价格列表
  const groupedPrices = useMemo(() => {
    if (!event?.prices) return {}
    
    const groups: Record<string, Array<{ price: Price; index: number }>> = {
      entry: [],
      queue: [],
      drink: [],
      combo: [],
      other: []
    }
    
    event.prices.forEach((price, index) => {
      const ticketKind = price.ticket_kind || null
      const category = getTicketCategory(ticketKind)
      groups[category].push({ price, index })
    })
    
    return groups
  }, [event?.prices])

  // 检查选中的票是否需要21+限制
  const selectedRequires21Plus = useMemo(() => {
    if (!selectedPrice) return false
    return requires21Plus(selectedPrice.ticket_kind || null)
  }, [selectedPrice])

  const handleBuyTickets = async () => {
    // 验证用户登录状态 - 确保只在客户端执行
    if (typeof window === 'undefined') {
      setPaymentError('Page is loading, please try again later')
      return
    }

    // Verify user is logged in via Supabase Auth - use browser singleton
    try {
      if (typeof window !== 'undefined') {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabaseClient = getSupabaseBrowser()
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
        
        if (sessionError || !session?.user) {
          setPaymentError('Please login first to purchase tickets')
          return
        }
      } else {
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

    // 检查21+年龄限制
    const customerAgeNum = parseInt(customerAge)
    if (selectedRequires21Plus && customerAgeNum < 21) {
      setPaymentError('This ticket type requires you to be 21 years or older')
      return
    }

    if (!selectedPrice) {
      setPaymentError('Please select a ticket type')
      return
    }

    // 只在有库存限制时检查库存（inventory为null表示无限）
    if (selectedPrice.inventory !== null && selectedPrice.inventory !== undefined && selectedPrice.inventory < quantity) {
      setPaymentError('Insufficient ticket inventory')
      return
    }

    setPaymentLoading(true)
    setPaymentError('')

    try {
      // Get user info from Supabase Auth session - use browser singleton
      // Use Supabase Auth as the ONLY source of identity
      let supabaseUid = null
      
      if (typeof window !== 'undefined') {
        try {
          // Get current user from Supabase Auth - use browser singleton
          const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
          const supabaseClient = getSupabaseBrowser()
          const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
            
            if (!authError && authUser) {
              supabaseUid = authUser.id
              console.log('[EventDetailClient] Got Supabase Auth UID:', supabaseUid)
            } else {
              console.warn('[EventDetailClient] Could not get user from Supabase:', authError)
              setPaymentError('Please login first to purchase tickets')
              setPaymentLoading(false)
              return
            }
          }
          
          // Verify UUID format (Supabase Auth UID)
          if (supabaseUid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(supabaseUid)) {
              console.warn('[EventDetailClient] Invalid Supabase Auth UID format:', supabaseUid)
              setPaymentError('Invalid user session. Please login again.')
              setPaymentLoading(false)
              return
            }
          } else {
            setPaymentError('Please login first to purchase tickets')
            setPaymentLoading(false)
            return
          }
        } catch (error) {
          console.error('[EventDetailClient] Failed to get user information:', error)
          setPaymentError('Failed to verify user session. Please login again.')
          setPaymentLoading(false)
          return
        }
      }

      // 创建 Stripe 结账会话
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id, // 使用 event_id（API 期望的字段名）
          price_id: selectedPrice.id, // 使用 price_id（API 期望的字段名）
          quantity: quantity,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_age: parseInt(customerAge),
          userId: supabaseUid, // 传递 Supabase Auth UID
          userToken: user?.token ?? 'local-token',
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
              customerAge: parseInt(customerAge)
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
                Purchase Tickets
              </h2>

              {/* 票种选择 - 按分类显示 */}
              <div style={{ marginBottom: '24px' }}>
                {/* 常规入场票 (18-20, 21+) */}
                {groupedPrices.entry.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      Entry Tickets
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedPrices.entry.map(({ price, index }) => (
                        <div key={price.id} style={{
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
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '4px'
                              }}>
                                <h4 style={{
                                  fontSize: '1rem',
                                  fontWeight: 'bold',
                                  color: 'white',
                                  margin: 0
                                }}>
                                  {price.label}
                                </h4>
                                {price.ticket_kind === 'entry_21_plus' && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#fca5a5',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                  }}>
                                    21+
                                  </span>
                                )}
                                {price.ticket_kind === 'entry_18_20' && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    backgroundColor: 'rgba(34, 211, 238, 0.2)',
                                    color: '#67e8f9',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                  }}>
                                    18-20
                                  </span>
                                )}
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: '#22c55e'
                                }}>
                                  ${(price.amount / 100).toFixed(2)}
                                </span>
                                {price.inventory !== null && price.inventory !== undefined && (
                                  <span style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8'
                                  }}>
                                    Stock: {price.inventory > 0 ? '●' : '○'}
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
                              justifyContent: 'center',
                              flexShrink: 0
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
                  </div>
                )}

                {/* 插队票 */}
                {groupedPrices.queue.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      Queue Pass
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedPrices.queue.map(({ price, index }) => (
                        <div key={price.id} style={{
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
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: 'white',
                                marginBottom: '4px'
                              }}>
                                {price.label}
                              </h4>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: '#22c55e'
                                }}>
                                  ${(price.amount / 100).toFixed(2)}
                                </span>
                                {price.inventory !== null && price.inventory !== undefined && (
                                  <span style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8'
                                  }}>
                                    Stock: {price.inventory > 0 ? '●' : '○'}
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
                              justifyContent: 'center',
                              flexShrink: 0
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
                  </div>
                )}

                {/* 酒水票 */}
                {groupedPrices.drink.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      Drink Tickets
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedPrices.drink.map(({ price, index }) => (
                        <div key={price.id} style={{
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
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '4px'
                              }}>
                                <h4 style={{
                                  fontSize: '1rem',
                                  fontWeight: 'bold',
                                  color: 'white',
                                  margin: 0
                                }}>
                                  {price.label}
                                </h4>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  borderRadius: '4px',
                                  fontWeight: '500'
                                }}>
                                  21+
                                </span>
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: '#22c55e'
                                }}>
                                  ${(price.amount / 100).toFixed(2)}
                                </span>
                                {price.inventory !== null && price.inventory !== undefined && (
                                  <span style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8'
                                  }}>
                                    Stock: {price.inventory > 0 ? '●' : '○'}
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
                              justifyContent: 'center',
                              flexShrink: 0
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
                  </div>
                )}

                {/* Combo票 */}
                {groupedPrices.combo.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      Combo Package
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedPrices.combo.map(({ price, index }) => (
                        <div key={price.id} style={{
                          padding: '16px',
                          backgroundColor: selectedPriceIndex === index ? 'rgba(124, 58, 237, 0.2)' : 'rgba(55, 65, 81, 0.3)',
                          border: selectedPriceIndex === index ? '2px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative'
                        }}
                        onClick={() => setSelectedPriceIndex(index)}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '4px'
                              }}>
                                <h4 style={{
                                  fontSize: '1rem',
                                  fontWeight: 'bold',
                                  color: 'white',
                                  margin: 0
                                }}>
                                  {price.label}
                                </h4>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  borderRadius: '4px',
                                  fontWeight: '500'
                                }}>
                                  21+ Only
                                </span>
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#94a3b8',
                                marginBottom: '8px'
                              }}>
                                Includes: Entry Ticket + Drink Ticket
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: '#22c55e'
                                }}>
                                  ${(price.amount / 100).toFixed(2)}
                                </span>
                                {price.inventory !== null && price.inventory !== undefined && (
                                  <span style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8'
                                  }}>
                                    Stock: {price.inventory > 0 ? '●' : '○'}
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
                              justifyContent: 'center',
                              flexShrink: 0
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
                  </div>
                )}

                {/* 其他类型 */}
                {groupedPrices.other.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      Other
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupedPrices.other.map(({ price, index }) => (
                        <div key={price.id} style={{
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
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: 'white',
                                marginBottom: '4px'
                              }}>
                                {price.label}
                              </h4>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 'bold',
                                  color: '#22c55e'
                                }}>
                                  ${(price.amount / 100).toFixed(2)}
                                </span>
                                {price.inventory !== null && price.inventory !== undefined && (
                                  <span style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8'
                                  }}>
                                    Stock: {price.inventory > 0 ? '●' : '○'}
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
                              justifyContent: 'center',
                              flexShrink: 0
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
                  </div>
                )}
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
                  alignItems: 'center',
                  marginBottom: '8px'
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
