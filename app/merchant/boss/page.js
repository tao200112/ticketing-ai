'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'
import Link from 'next/link'

export default function MerchantBossPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [merchantUser, setMerchantUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isBossVerified, setIsBossVerified] = useState(false)
  const [bossPassword, setBossPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const checkMerchantAuth = () => {
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      const parsedUser = JSON.parse(user)
      setMerchantUser(parsedUser)
      
      // 所有商家用户都可以访问Boss页面，通过密码验证
      setUserRole('boss') // 设置为boss，但仅用于导航栏显示
      
      // 检查是否已经通过Boss验证
      const bossVerified = sessionStorage.getItem('bossVerified') === 'true'
      if (bossVerified) {
        setIsBossVerified(true)
        loadStats()
      }
    }
    
    checkMerchantAuth()
  }, [router])

  const handleBossPasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError('')
    
    const correctPassword = 'boss123' // 可以在环境变量中配置
    
    if (bossPassword === correctPassword) {
      setIsBossVerified(true)
      sessionStorage.setItem('bossVerified', 'true')
      loadStats()
    } else {
      setPasswordError('Incorrect password, please try again')
      setBossPassword('')
    }
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const currentMerchant = JSON.parse(localStorage.getItem('merchantUser') || '{}')
      const merchantId = currentMerchant.merchant_id || currentMerchant.merchant?.id
      
      const ordersResponse = await fetch('/api/admin/tickets')
      const ordersData = await ordersResponse.json()
      
      const eventsResponse = await fetch('/api/events')
      const eventsData = await eventsResponse.json()
      
      const allEvents = eventsData.success ? eventsData.data : []
      const merchantEvents = allEvents.filter(event => event.merchant_id === merchantId)
      const merchantTickets = ordersData.tickets?.filter(ticket => {
        return ticket.event_id && merchantEvents.some(e => e.id === ticket.event_id)
      }) || []
      const merchantOrders = ordersData.orders?.filter(order => {
        return merchantTickets.some(t => t.order_id === order.id)
      }) || []
      
      const today = new Date().toISOString().split('T')[0]
      const todayOrders = merchantOrders.filter(order => 
        order.created_at && order.created_at.startsWith(today)
      )
      
      const todaySold = todayOrders.reduce((total, order) => {
        return total + (merchantTickets.filter(t => t.order_id === order.id).length || 0)
      }, 0)
      
      const totalRevenue = todayOrders.reduce((total, order) => {
        return total + (order.total_amount_cents || 0)
      }, 0) / 100
      
      const todayVerified = merchantTickets.filter(ticket => 
        ticket.used_at && ticket.used_at.startsWith(today)
      ).length
      
      const lowStockAlerts = merchantEvents.filter(event => {
        const eventTickets = merchantTickets.filter(t => t.event_id === event.id)
        return eventTickets.length < 10
      }).length
      
      setStats({
        todaySold,
        todayVerified,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        lowStockAlerts,
        source: 'supabase'
      })
      
    } catch (err) {
      setError('Failed to load statistics')
      console.error('Error loading statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  // 密码验证界面
  if (!isBossVerified) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px'
      }}>
        <MerchantNavbar userRole={userRole} />
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Boss Management
          </h2>
          <p style={{
            color: '#94a3b8',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            Please enter password to access full features
          </p>
          
          <form onSubmit={handleBossPasswordSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="password"
                value={bossPassword}
                onChange={(e) => setBossPassword(e.target.value)}
                placeholder="Enter management password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                required
                autoFocus
              />
              {passwordError && (
                <p style={{
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '8px'
                }}>
                  {passwordError}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <MerchantNavbar userRole={userRole} />
        <div style={{ color: 'white', fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <MerchantNavbar userRole={userRole} />
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '448px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#ef4444', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Loading Failed
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={loadStats}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
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
      title: 'Revenue Today',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      subtitle: 'USD',
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
      paddingTop: '80px'
    }}>
      <MerchantNavbar userRole={userRole} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>
            Boss Management
          </h1>
          <p style={{ color: '#94a3b8' }}>View and manage your event data</p>
        </div>

        {/* Statistics Cards */}
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
              padding: '24px'
            }}>
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

        {/* Quick Actions */}
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
            <Link href="/merchant/events" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📅</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                  Event Management
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  View and edit events
                </p>
              </div>
            </Link>
            
            <Link href="/merchant/purchases" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(168, 85, 247, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                  Revenue
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  View all orders and revenue
                </p>
              </div>
            </Link>
            
            <Link href="/merchant/staff" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%)',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(236, 72, 153, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📱</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                  Scan Tickets
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Redeem and manage tickets
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

