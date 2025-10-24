'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabase } from '../../lib/safeEnv'
import Link from 'next/link'

export default function MerchantOverviewPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
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
      loadStats()
    }
    
    checkMerchantAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('merchantToken')
    localStorage.removeItem('merchantUser')
    router.push('/merchant/auth/login')
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // 从本地存储获取真实数据
      const merchantEvents = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      const orders = JSON.parse(localStorage.getItem('orders') || '[]')
      const tickets = JSON.parse(localStorage.getItem('tickets') || '[]')
      
      // 获取当前商户的用户信息
      const currentMerchant = JSON.parse(localStorage.getItem('merchantUser') || '{}')
      
      // 计算今日日期
      const today = new Date().toISOString().split('T')[0]
      
      // 筛选当前商户的订单
      const merchantOrders = orders.filter(order => 
        order.merchant_id === currentMerchant.id || 
        order.merchantEmail === currentMerchant.email
      )
      
      // 筛选今日的订单
      const todayOrders = merchantOrders.filter(order => 
        order.created_at && order.created_at.startsWith(today)
      )
      
      // 计算今日售出的票数
      const todaySold = todayOrders.reduce((total, order) => {
        return total + (order.quantity || 0)
      }, 0)
      
      // 计算今日收入
      const totalRevenue = todayOrders.reduce((total, order) => {
        return total + (order.total_amount || 0)
      }, 0)
      
      // 筛选当前商户的票务
      const merchantTickets = tickets.filter(ticket => 
        ticket.merchant_id === currentMerchant.id ||
        ticket.merchantEmail === currentMerchant.email
      )
      
      // 筛选今日验证的票务
      const todayVerified = merchantTickets.filter(ticket => 
        ticket.verified_at && ticket.verified_at.startsWith(today)
      ).length
      
      // 检查低库存警告
      const lowStockAlerts = merchantEvents.filter(event => {
        if (!event.prices || event.prices.length === 0) return false
        return event.prices.some(price => price.inventory < 10)
      }).length
      
      setStats({
        todaySold,
        todayVerified,
        totalRevenue: Math.round(totalRevenue / 100), // 转换为元
        lowStockAlerts,
        source: 'local'
      })
      
    } catch (err) {
      setError('Failed to load statistics')
      console.error('Error loading statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        padding: '32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              height: '32px',
              backgroundColor: '#374151',
              borderRadius: '8px',
              width: '192px',
              marginBottom: '8px',
              animation: 'pulse 2s infinite'
            }}></div>
            <div style={{
              height: '16px',
              backgroundColor: '#374151',
              borderRadius: '8px',
              width: '384px',
              animation: 'pulse 2s infinite'
            }}></div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px'
              }}>
                <div style={{
                  height: '16px',
                  backgroundColor: '#374151',
                  borderRadius: '8px',
                  width: '96px',
                  marginBottom: '8px',
                  animation: 'pulse 2s infinite'
                }}></div>
                <div style={{
                  height: '32px',
                  backgroundColor: '#374151',
                  borderRadius: '8px',
                  width: '64px',
                  marginBottom: '8px',
                  animation: 'pulse 2s infinite'
                }}></div>
                <div style={{
                  height: '12px',
                  backgroundColor: '#374151',
                  borderRadius: '8px',
                  width: '128px',
                  animation: 'pulse 2s infinite'
                }}></div>
              </div>
            ))}
          </div>
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
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '448px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#ef4444', marginBottom: '16px' }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Loading Failed
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={loadStats}
            className="btn-partytix-gradient"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

    const statCards = [
    {
      title: 'Tickets Sold Today',
      value: stats?.todaySold || 0,
      subtitle: 'tickets',
      icon: '🎫',
      color: '#22c55e'
    },
    {
      title: 'Verified Today',
      value: stats?.todayVerified || 0,
      subtitle: 'tickets',
      icon: '✅',
      color: '#3b82f6'
    },
    {
      title: 'Total Revenue',
      value: `¥${(stats?.totalRevenue || 0).toLocaleString()}`,
      subtitle: 'today',
      icon: '💰',
      color: '#eab308'
    },
    {
      title: 'Low Stock Alerts',
      value: stats?.lowStockAlerts || 0,
      subtitle: 'events',
      icon: '⚠️',
      color: '#f97316'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}>
                Merchant Console
              </h1>
              <p style={{ color: '#94a3b8' }}>Manage your events and ticket data</p>
              {stats?.source && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                  Data Source: {stats.source}
                </p>
              )}
            </div>
            
            {/* 用户信息和登出按钮 */}
            {merchantUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'white', fontWeight: '500', fontSize: '0.875rem' }}>
                    {merchantUser.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {merchantUser.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '0.5rem',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
                    e.target.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {statCards.map((card, index) => (
            <div key={index} style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '24px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)'}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '1.5rem' }}>{card.icon}</div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: card.color
                }}>
                  {card.title}
                </div>
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '4px'
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                {card.subtitle}
              </div>
            </div>
          ))}
        </div>

        {/* 快速操作 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px'
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {/* Manage Events Card */}
            <Link 
              href="/merchant/events"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                borderRadius: '50%',
                opacity: '0.3'
              }}></div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '16px',
                  boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                }}>
                  📅
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    Manage Events
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    margin: '0'
                  }}>
                    View and edit your events
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: '#3b82f6',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>Access Events →</span>
              </div>
            </Link>
            
            {/* Create Event Card */}
            <Link 
              href="/merchant/events/new"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(34, 197, 94, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.2)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                borderRadius: '50%',
                opacity: '0.3'
              }}></div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '16px',
                  boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)'
                }}>
                  ➕
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    Create Event
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    margin: '0'
                  }}>
                    Launch a new event
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: '#22c55e',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>Start Creating →</span>
              </div>
            </Link>
            
            {/* Purchase Records Card */}
            <Link 
              href="/merchant/purchases"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(168, 85, 247, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                borderRadius: '50%',
                opacity: '0.3'
              }}></div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '16px',
                  boxShadow: '0 8px 16px rgba(168, 85, 247, 0.3)'
                }}>
                  📊
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    Purchase Records
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    margin: '0'
                  }}>
                    View all ticket purchases
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: '#a855f7',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>View Records →</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}