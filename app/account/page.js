'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '../../components/NavbarPartyTix'
import LoginForm from '../../components/LoginForm'
import RegisterForm from '../../components/RegisterForm'
import { createClient } from '@supabase/supabase-js'
import { QRCodeSVG } from 'qrcode.react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [orders, setOrders] = useState([])
  const [supabase, setSupabase] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    // 检查是否有用户会话
    const userSession = localStorage.getItem('userSession')
    
    if (!userSession) {
      setLoading(false)
      setShowLogin(true)
      return
    }

    // 初始化 Supabase 客户端
    if (supabaseUrl && supabaseKey) {
      try {
        const sessionData = JSON.parse(userSession)
        const client = createClient(supabaseUrl, supabaseKey)
        setSupabase(client)
        
        // 使用会话中的用户ID加载数据
        if (sessionData.id) {
          loadUserData(client, sessionData.id)
        } else {
          setLoading(false)
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('❌ 解析会话失败:', error)
        setLoading(false)
        router.push('/auth/login')
      }
    } else {
      setLoading(false)
      router.push('/auth/login')
    }
  }, [router])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setShowLogin(false)
    setShowRegister(false)
    // 重新加载用户数据
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey)
      loadUserData(client, userData.id)
    }
  }

  const handleRegisterSuccess = (userData) => {
    setUser(userData)
    setShowLogin(false)
    setShowRegister(false)
    // 重新加载用户数据
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey)
      loadUserData(client, userData.id)
    }
  }

  const handleSwitchToRegister = () => {
    setShowLogin(false)
    setShowRegister(true)
  }

  const handleSwitchToLogin = () => {
    setShowRegister(false)
    setShowLogin(true)
  }

  const loadUserData = async (client, userId) => {
    try {
      // 获取用户信息
      const { data: userData, error: userError } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('❌ 获取用户信息失败:', userError)
        setLoading(false)
        router.push('/auth/login')
        return
      }

      if (userData) {
        delete userData.password_hash
        setUser(userData)
      }

      // 获取用户票务（按邮箱筛选）
      const { data: ticketsData } = await client
        .from('tickets')
        .select(`
          *,
          orders (
            id,
            customer_email,
            total_amount_cents,
            currency,
            status,
            created_at
          ),
          events (
            id,
            title,
            start_at,
            venue_name,
            address
          )
        `)
        .eq('holder_email', userData.email)
        .order('created_at', { ascending: false })

      if (ticketsData) {
        setTickets(ticketsData)
      }

      // 获取用户订单（按邮箱筛选）
      const { data: ordersData } = await client
        .from('orders')
        .select('*')
        .eq('customer_email', userData.email)
        .order('created_at', { ascending: false })

      if (ordersData) {
        setOrders(ordersData)
      }

    } catch (error) {
      console.error('❌ 加载用户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    // 清除会话
    localStorage.removeItem('userSession')
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('❌ 登出失败:', error)
      }
    }
    setUser(null)
    setTickets([])
    setOrders([])
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading your account...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // 显示登录表单
  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
      }}>
        <NavbarPartyTix />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '100px 20px 20px 20px'
        }}>
          <LoginForm 
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </div>
      </div>
    )
  }

  // 显示注册表单
  if (showRegister) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
      }}>
        <NavbarPartyTix />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '100px 20px 20px 20px'
        }}>
          <RegisterForm 
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      <NavbarPartyTix />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '100px 24px 40px 24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px', 
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px'
            }}>
              My Account
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
              Welcome back, {user?.name || 'User'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setUser(null)
                setTickets([])
                setOrders([])
                setShowLogin(true)
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              Switch Account
            </button>
            <button
              onClick={handleLogout}
              className="btn-partytix-gradient"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Info */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
            Account Information
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Name:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.name || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Email:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Age:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.age || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Role:</span>
              <span style={{ 
                color: 'white', 
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {user?.role || 'User'}
              </span>
            </div>
          </div>
        </div>

        {/* My Tickets */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
            My Tickets ({tickets?.length || 0})
          </h2>
          
          {(tickets?.length || 0) === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'rgba(255, 255, 255, 0.6)',
              padding: '40px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No tickets yet</div>
              <div style={{ fontSize: '14px' }}>Purchase tickets for events to see them here</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {(tickets || []).map(ticket => (
                <div
                  key={ticket.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '24px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '8px', fontWeight: '600' }}>
                        {ticket.events?.title || 'Event Ticket'}
                      </h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '12px' }}>
                        Ticket #{ticket.short_id || ticket.id.substring(0, 8)}
                      </p>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px',
                        fontSize: '14px'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>🎫 Tier:</span> {ticket.tier || 'General'}
                        </div>
                        {ticket.events?.start_at && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Date:</span> {new Date(ticket.events.start_at).toLocaleDateString()}
                          </div>
                        )}
                        {ticket.events?.venue_name && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📍 Venue:</span> {ticket.events.venue_name}
                          </div>
                        )}
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Issued:</span> {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          background: ticket.status === 'used' ? 'rgba(34, 197, 94, 0.2)' : 
                                     ticket.status === 'unused' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: ticket.status === 'used' ? '#22c55e' : 
                                 ticket.status === 'unused' ? '#22D3EE' : '#ef4444',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {ticket.status || 'Unknown'}
                        </span>
                        {ticket.orders && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                            💰 ${ticket.orders.total_amount_cents ? (ticket.orders.total_amount_cents / 100).toFixed(2) : '0.00'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '180px'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(124, 58, 237, 0.1)',
                        borderRadius: '8px',
                        padding: '8px',
                        marginBottom: '4px'
                      }}>
                        <QRCodeSVG 
                          value={ticket.qr_payload || JSON.stringify({
                            ticket_id: ticket.id,
                            short_id: ticket.short_id,
                            event_id: ticket.event_id
                          })}
                          size={150}
                          level="M"
                        />
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#666', 
                        textAlign: 'center',
                        fontWeight: '500'
                      }}>
                        Scan for Entry
                      </div>
                      {ticket.short_id && (
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#999',
                          fontFamily: 'monospace'
                        }}>
                          ID: {ticket.short_id}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase History */}
        {(orders?.length || 0) > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
              Purchase History ({orders?.length || 0})
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {(orders || []).map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                        Order #{order.id.substring(0, 8)}
                      </h3>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        <span>💰 Total: ${order.total_amount_cents ? (order.total_amount_cents / 100).toFixed(2) : '0.00'}</span>
                        <span>📅 Date: {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        background: order.status === 'completed' || order.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 
                                   order.status === 'pending' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: order.status === 'completed' || order.status === 'paid' ? '#22c55e' : 
                               order.status === 'pending' ? '#fbbf24' : '#ef4444',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}>
                        {order.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}