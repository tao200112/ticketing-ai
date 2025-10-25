'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '../../../components/AuthGuard'
import { getDefaultEvent } from '../../../lib/default-events'

export default function EventPage() {
  const params = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedPrice, setSelectedPrice] = useState(0)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [ticketValidityDate, setTicketValidityDate] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    loadEvent()
    loadUserData()
    
    // 添加超时机制，防止无限加载
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Event loading timeout, forcing completion')
        setLoading(false)
        if (!event) {
          setError('Event loading timeout')
        }
      }
    }, 5000) // 5秒超时
    
    return () => clearTimeout(timeout)
  }, [params.slug])

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        if (user.isLoggedIn) {
          setCustomerEmail(user.email || '')
          setCustomerName(user.name || '')
        }
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  }

  const createDefaultEventData = () => {
    console.log('创建默认活动数据...')
    const defaultEvent = {
      id: 'ridiculous-chicken',
      title: 'Ridiculous Chicken Night Event',
      description: 'Join us for an unforgettable night of ridiculous fun!',
      startTime: '2024-12-31T20:00:00.000Z',
      endTime: '2025-01-01T02:00:00.000Z',
      location: 'PartyTix Venue',
      maxAttendees: 100,
      prices: [
        {
          id: 'regular',
          name: 'Regular Ticket (21+)',
          amount_cents: 1500,
          inventory: 50,
          limit_per_user: 4
        }
      ],
      ticketsSold: 0,
      totalTickets: 100,
      created_at: new Date().toISOString()
    }
    
    // 保存到 localStorage
    const existingEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
    const updatedEvents = [...existingEvents, defaultEvent]
    localStorage.setItem('merchantEvents', JSON.stringify(updatedEvents))
    
    console.log('默认活动数据已创建')
    return defaultEvent
  }

  const loadEvent = () => {
    try {
      setLoading(true)
      console.log('=== 开始加载活动 ===')
      console.log('当前 slug:', params.slug)
      
      // 首先检查是否是默认的Ridiculous Chicken活动
      if (params.slug === 'ridiculous-chicken-night-event') {
        console.log('匹配默认活动')
        const defaultEvent = getDefaultEvent('ridiculous-chicken')
        if (defaultEvent) {
          console.log('找到默认活动:', defaultEvent)
          // 转换默认活动数据格式以匹配页面期望的格式
          const formattedEvent = {
            id: defaultEvent.id,
            title: defaultEvent.name,
            description: defaultEvent.description,
            startTime: defaultEvent.start_date,
            endTime: defaultEvent.end_date,
            location: defaultEvent.location,
            maxAttendees: defaultEvent.max_attendees,
            prices: defaultEvent.prices,
            ticketsSold: 0,
            totalTickets: defaultEvent.max_attendees
          }
          console.log('格式化后的活动:', formattedEvent)
          setEvent(formattedEvent)
          if (formattedEvent.prices && formattedEvent.prices.length > 0) {
            setSelectedPrice(0) // 选择第一个价格
          }
          setLoading(false)
          return
        } else {
          console.log('未找到默认活动，尝试创建默认数据...')
          // 如果找不到默认活动，创建默认数据
          const createdEvent = createDefaultEventData()
          const formattedEvent = {
            id: createdEvent.id,
            title: createdEvent.title,
            description: createdEvent.description,
            startTime: createdEvent.startTime,
            endTime: createdEvent.endTime,
            location: createdEvent.location,
            maxAttendees: createdEvent.maxAttendees,
            prices: createdEvent.prices,
            ticketsSold: createdEvent.ticketsSold,
            totalTickets: createdEvent.totalTickets
          }
          console.log('使用创建的默认活动:', formattedEvent)
          setEvent(formattedEvent)
          if (formattedEvent.prices && formattedEvent.prices.length > 0) {
            setSelectedPrice(0)
          }
          setLoading(false)
          return
        }
      }
      
      // 从本地存储加载商家事件
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      
      console.log('Looking for slug:', params.slug)
      console.log('Available merchant events:', merchantEvents.map(e => ({
        id: e.id,
        title: e.title,
        slug: e.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()
      })))
      
      // 检查是否有任何活动数据
      if (merchantEvents.length === 0) {
        console.log('No merchant events found in localStorage')
        setError('No events available')
        setLoading(false)
        return
      }
      
      // 根据slug查找事件
      const foundEvent = merchantEvents.find(e => {
        // 使用title字段生成slug（与EventCard组件保持一致）
        const eventSlug = e.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
        console.log(`Comparing: "${eventSlug}" === "${params.slug}"`)
        return eventSlug === params.slug
      })

      if (!foundEvent) {
        console.log('Event not found for slug:', params.slug)
        setError('Event not found')
        setLoading(false)
        return
      }
      
      console.log('Found event:', foundEvent)
      setEvent(foundEvent)
      if (foundEvent.prices && foundEvent.prices.length > 0) {
        setSelectedPrice(0) // 选择第一个价格
      }
      setLoading(false)
    } catch (err) {
      setError('Failed to load event')
      console.error('加载事件错误:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyTickets = async () => {
    // 检查用户是否已登录
    const userData = localStorage.getItem('userData')
    if (!userData) {
      setPaymentError('请先登录后再购买票据')
      return
    }

    const user = JSON.parse(userData)
    if (!user.isLoggedIn || !user.id) {
      setPaymentError('请先登录后再购买票据')
      return
    }

    if (!event || !event.prices || event.prices.length === 0) {
      setPaymentError('No tickets available for this event')
      return
    }

    const selectedPriceData = event.prices[selectedPrice]
    
    if (selectedPriceData.inventory < quantity) {
      setPaymentError('Insufficient tickets available')
      return
    }

    if (!customerEmail || !customerName) {
      setPaymentError('Please enter your email and name')
      return
    }

    if (!ticketValidityDate) {
      setPaymentError('Please select ticket validity date')
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

      // 创建Stripe结账会话
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketType: selectedPriceData.name,
          quantity: quantity,
          customerEmail: customerEmail,
          customerName: customerName,
          userId: user.id,
          userToken: user.token || 'local-token',
          ticketValidityDate: ticketValidityDate,
          ticketValidityStart: validityStartTime.toISOString(),
          ticketValidityEnd: validityEndTime.toISOString(),
          eventData: event
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 保存购买信息到localStorage，供成功页面使用
        const purchaseInfo = {
          eventId: event.id,
          eventTitle: event.title,
          ticketType: selectedPriceData.name,
          quantity: quantity,
          totalAmount: selectedPriceData.amount_cents * quantity,
          customerEmail: customerEmail,
          customerName: customerName,
          ticketValidityDate: ticketValidityDate,
          ticketValidityStart: validityStartTime.toISOString(),
          ticketValidityEnd: validityEndTime.toISOString()
        }
        localStorage.setItem('recentPurchase', JSON.stringify(purchaseInfo))
        
        // 跳转到Stripe结账页面
        window.location.href = data.url
      } else {
        setPaymentError(`Payment setup failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentError('Payment setup failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid #f3f4f6',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ color: '#94a3b8' }}>Loading event...</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '8px' }}>
            Slug: {params.slug}
          </p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <svg style={{ width: '3rem', height: '3rem', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Event Not Found
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{error || 'The event you are looking for does not exist.'}</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Looking for: {params.slug}
          </p>
          <Link 
            href="/events"
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const selectedPriceData = event.prices && event.prices[selectedPrice]
  const totalPrice = selectedPriceData ? (selectedPriceData.amount_cents * quantity) / 100 : 0

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
            {event.title}
          </h1>

          <p style={{
            color: '#cbd5e1',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            {event.description}
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
                  {new Date(event.startTime).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

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
                  {new Date(event.endTime).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

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
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Location</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{event.location}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'rgba(55, 65, 81, 0.3)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem' }}>🎫</div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Tickets Sold</div>
                <div style={{ color: 'white', fontWeight: '500' }}>
                  {event.ticketsSold || 0} / {event.totalTickets || 0}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 购票区域 */}
        {event.prices && event.prices.length > 0 ? (
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
                <div key={index} style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: selectedPrice === index ? 'rgba(124, 58, 237, 0.2)' : 'rgba(55, 65, 81, 0.3)',
                  border: selectedPrice === index ? '2px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setSelectedPrice(index)}>
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
                      <p style={{
                        color: '#94a3b8',
                        fontSize: '0.875rem',
                        marginBottom: '8px'
                      }}>
                        Stock: {price.inventory} tickets
                      </p>
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
                          ${(price.amount_cents / 100).toFixed(2)}
                        </span>
                        {price.limit_per_user && (
                          <span style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            (Max {price.limit_per_user} per person)
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: selectedPrice === index ? '2px solid #7c3aed' : '2px solid #6b7280',
                      backgroundColor: selectedPrice === index ? '#7c3aed' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedPrice === index && (
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
                客户信息
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
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="请输入您的姓名"
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
                    邮箱 *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="请输入您的邮箱"
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
                选择票券有效期 *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    marginBottom: '4px'
                  }}>
                    票券日期
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
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7c3aed'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.target.style.boxShadow = 'none'
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
                    有效期时间
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
                    16:00 - 次日 02:00
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
                ℹ️ 票券有效期为选定日期的 16:00 至次日 02:00。请确保在有效期内使用。
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
                数量
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
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!paymentLoading) {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              {paymentLoading ? '处理中...' : '立即购票'}
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
              This event doesn't have any tickets for sale yet.
            </p>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  )
}
