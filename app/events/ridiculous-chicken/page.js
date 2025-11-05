'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '../../../components/AuthGuard'

export default function RidiculousChickenEvent() {
  const [quantity, setQuantity] = useState(1)
  const [selectedPrice, setSelectedPrice] = useState('regular')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    try {
      // 优先使用 userSession（与登录系统一致）
      const userSession = localStorage.getItem('userSession')
      if (userSession) {
        const user = JSON.parse(userSession)
        if (user?.id) {
          setCustomerEmail(user.email || '')
          setCustomerName(user.name || '')
          return
        }
      }
      
      // 回退到 userData（兼容旧版本）
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

  const event = {
    name: "Ridiculous Chicken Night Event",
    description: "Enjoy delicious chicken and an amazing night at Virginia Tech's most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.",
    time: "October 25, 2025 8:00 PM",
    venue: "201 N Main St SUITE A, Blacksburg, VA 24060",
    duration: "3 hours",
    ageRestriction: "18+"
  }

  const prices = [
    {
      id: 'regular',
      name: 'Regular Ticket (21+)',
      price: 15,
      amount_cents: 1500,
      description: 'For ages 21 and above',
      inventory: 100,
      available: true
    },
    {
      id: 'special',
      name: 'Special Ticket (18-20)',
      price: 30,
      amount_cents: 3000,
      description: 'For ages 18-20 only',
      inventory: 50,
      available: true
    }
  ]

  const selectedPriceData = prices.find(p => p.id === selectedPrice)
  const totalPrice = selectedPriceData ? selectedPriceData.price * quantity : 0

  const handleBuyTickets = async () => {
    if (!selectedDate) {
      setError('Please select a purchase date')
      return
    }

    if (!customerEmail || !customerName) {
      setError('Please fill in email and name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 获取用户认证信息
      const userData = localStorage.getItem('userData')
      let userToken = null
      let userId = null
      
      if (userData) {
        try {
          const user = JSON.parse(userData)
          if (user.isLoggedIn) {
            userToken = user.token || 'demo-token'
            userId = user.id || 'demo-user'
          }
        } catch (error) {
          console.error('解析用户数据失败:', error)
        }
      }

      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: 'ridiculous-chicken',
          price_id: selectedPrice,
          quantity: quantity,
          customer_email: customerEmail,
          customer_name: customerName
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else if (response.ok && data.demo) {
        // 演示模式
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create payment session')
      }
    } catch (err) {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

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
            {event.name}
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
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Time</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{event.time}</div>
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
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Venue</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{event.venue}</div>
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
              <div style={{ fontSize: '1.5rem' }}>⏱️</div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Duration</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{event.duration}</div>
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
              <div style={{ fontSize: '1.5rem' }}>🔞</div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Age Restriction</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{event.ageRestriction}</div>
              </div>
            </div>
          </div>
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
            Select Ticket Type
          </h2>

          {/* 票种选择 */}
          <div style={{ marginBottom: '24px' }}>
            {prices.map((price) => (
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
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.875rem',
                      marginBottom: '8px'
                    }}>
                      {price.description}
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
                        ${price.price}
                      </span>
                      {price.originalPrice && (
                        <span style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          textDecoration: 'line-through'
                        }}>
                          ¥{price.originalPrice}
                        </span>
                      )}
                    </div>
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
            ))}
          </div>

          {/* 购票日期选择 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Purchase Date *
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                marginBottom: '8px'
              }}
            >
              <option value="">Please select purchase date</option>
              {[0, 1, 2, 3, 4, 5, 6].map(days => {
                const date = new Date()
                date.setDate(date.getDate() + days)
                const dateStr = date.toISOString().split('T')[0]
                const displayStr = date.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit',
                  weekday: 'short'
                })
                return (
                  <option key={dateStr} value={dateStr}>{displayStr}</option>
                )
              })}
            </select>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              marginTop: '4px'
            }}>
              ⚠️ Ticket validity: Same day 4:00 PM - Next day 3:00 AM
            </div>
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
            
            {/* 客户信息备注 */}
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <div style={{
                  color: '#60a5fa',
                  fontSize: '1rem',
                  marginTop: '2px'
                }}>
                  ℹ️
                </div>
                <div style={{
                  color: '#e0e7ff',
                  fontSize: '0.875rem',
                  lineHeight: '1.4'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    Please provide accurate information
                  </div>
                  <div>
                    Your name and ID will be verified at the entrance. 
                    Please ensure all information is correct and matches your official identification.
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
                ${totalPrice}
              </span>
            </div>
          </div>

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

          {/* 购票按钮 */}
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
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            {loading ? 'Processing...' : 'Purchase Now'}
          </button>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
