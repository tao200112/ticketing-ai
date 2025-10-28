'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MerchantPurchasesPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [merchantUser, setMerchantUser] = useState(null)
  const [filter, setFilter] = useState('all') // all, today, week, month
  const [searchTerm, setSearchTerm] = useState('')

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
      loadPurchases()
    }
  }, [merchantUser])

  const loadPurchases = async () => {
    try {
      setLoading(true)
      
      if (!merchantUser) {
        setPurchases([])
        return
      }
      
      // 从 API 加载票据数据
      const response = await fetch('/api/admin/tickets')
      const result = await response.json()
      
      console.log('🔍 Purchase Records - API响应:', result)
      
      // 处理新的API响应格式 { tickets: [], orders: [] }
      const tickets = result.tickets || result || []
      const orders = result.orders || []
      
      if (tickets && Array.isArray(tickets)) {
        // 获取当前商家的活动ID
        const eventsResponse = await fetch('/api/events')
        const eventsResult = await eventsResponse.json()
        const allEvents = eventsResult.success ? eventsResult.data : []
        const merchantEvents = allEvents.filter(event => event.merchant_id === merchantUser.merchant_id)
        const merchantEventIds = merchantEvents.map(event => event.id)
        
        console.log('🔍 Purchase Records - 商家活动ID:', merchantEventIds)
        
        // 筛选当前商家的票据
        const merchantTickets = tickets.filter(ticket => {
          return merchantEventIds.includes(ticket.event_id)
        })
        
        console.log('🔍 Purchase Records - 商家票据:', merchantTickets)
        
        // 转换为购买记录格式
        const purchases = merchantTickets.map(ticket => {
          // 查找对应的活动信息
          const event = merchantEvents.find(e => e.id === ticket.event_id)
          const eventName = event?.title || event?.name || 'Unknown Event'
          
          // 查找对应的订单信息
          const order = orders.find(o => o.id === ticket.order_id)
          const amount = order?.total_amount_cents || 0
          const customerEmail = ticket.holder_email || order?.customer_email || ''
          const purchaseDate = order?.created_at || ticket.created_at || new Date().toISOString()
          
          return {
            id: ticket.id,
            eventName: eventName,
            ticketType: ticket.tier || 'General',
            quantity: 1,
            amount: amount,
            totalAmount: amount,
            customerName: customerEmail.split('@')[0],
            customerEmail: customerEmail,
            purchaseDate: purchaseDate,
            status: ticket.status === 'unused' ? 'completed' : ticket.status,
            orderId: ticket.short_id,
            ticketId: ticket.id
          }
        })
        
        console.log('📊 加载的购买记录数量:', purchases.length)
        setPurchases(purchases)
      } else {
        setPurchases([])
      }
    } catch (err) {
      console.error('加载购买记录错误:', err)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('merchantToken')
    localStorage.removeItem('merchantUser')
    router.push('/merchant/auth/login')
  }

  const filterPurchases = (purchases) => {
    let filtered = purchases

    // 按时间过滤
    const now = new Date()
    switch (filter) {
      case 'today':
        filtered = filtered.filter(p => {
          const purchaseDate = new Date(p.purchaseDate)
          return purchaseDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(p => new Date(p.purchaseDate) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(p => new Date(p.purchaseDate) >= monthAgo)
        break
    }

    // 按搜索词过滤
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const getTotalRevenue = (purchases) => {
    return purchases.reduce((total, purchase) => total + (purchase.amount || purchase.totalAmount || 0), 0)
  }

  const getTotalTickets = (purchases) => {
    return purchases.reduce((total, purchase) => total + purchase.quantity, 0)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        padding: '32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              border: '4px solid #f3f4f6',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto'
            }}></div>
            <p style={{ color: '#6b7280' }}>加载购买记录中...</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredPurchases = filterPurchases(purchases)
  const totalRevenue = getTotalRevenue(filteredPurchases)
  const totalTickets = getTotalTickets(filteredPurchases)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}>
                Purchase Records
              </h1>
              <p style={{ color: '#94a3b8' }}>View all ticket purchases for your events</p>
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
                  登出
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.5rem', marginRight: '12px' }}>💰</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Total Revenue</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              ${(totalRevenue / 100).toFixed(2)}
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.5rem', marginRight: '12px' }}>🎫</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Total Tickets</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              {totalTickets}
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.5rem', marginRight: '12px' }}>📊</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Total Orders</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              {filteredPurchases.length}
            </div>
          </div>
        </div>

        {/* 过滤和搜索 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 时间过滤 */}
            <div>
              <label style={{ color: 'white', fontSize: '0.875rem', marginRight: '0.5rem' }}>
                Filter:
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* 搜索 */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search by event, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
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
          </div>
        </div>

        {/* 购买记录列表 */}
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
            Purchase History
          </h2>

          {filteredPurchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No purchases found</h3>
              <p style={{ color: '#94a3b8' }}>
                {searchTerm ? 'No purchases match your search criteria.' : 'No purchases have been made for your events yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPurchases.map((purchase, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(55, 65, 81, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '20px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.3)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '4px'
                      }}>
                        {purchase.eventName}
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        {purchase.ticketType} × {purchase.quantity}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#22c55e'
                      }}>
                        ${((purchase.amount || purchase.totalAmount || 0) / 100).toFixed(2)}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Customer</div>
                      <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                        {purchase.customerName}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Email</div>
                      <div style={{ color: 'white', fontSize: '0.875rem' }}>
                        {purchase.customerEmail}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Order ID</div>
                      <div style={{ color: 'white', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {purchase.orderId}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Status</div>
                      <div style={{
                        color: purchase.status === 'completed' ? '#22c55e' : '#f59e0b',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {purchase.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 返回按钮 */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link
            href="/merchant"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#22D3EE',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '0.75rem 1.5rem',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '0.5rem',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(34, 211, 238, 0.1)'
              e.target.style.borderColor = 'rgba(34, 211, 238, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.borderColor = 'rgba(34, 211, 238, 0.3)'
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

