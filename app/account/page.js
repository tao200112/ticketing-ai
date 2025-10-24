'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查用户是否已登录
    const storedUserData = localStorage.getItem('userData')
    if (!storedUserData || !JSON.parse(storedUserData).isLoggedIn) {
      router.push('/auth/login')
      return
    }

    const user = JSON.parse(storedUserData)
    setUserData(user)

    // 从API获取用户的票据历史
    loadUserTickets(user)
  }, [router])

  const loadUserTickets = async (user) => {
    try {
      setLoading(true)
      
      // 直接从本地存储获取票据历史
      const storedUsers = JSON.parse(localStorage.getItem('localUsers') || '[]')
      const userRecord = storedUsers.find(u => u.email === user.email)
      
      if (userRecord && userRecord.tickets) {
        setTickets(userRecord.tickets)
        console.log('✅ 从localStorage加载票据:', userRecord.tickets.length, '张')
      } else {
        console.log('⚠️ 未找到用户票据记录')
        setTickets([])
      }
    } catch (error) {
      console.error('获取票据历史失败:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userData')
    router.push('/')
  }

  const generateQRCode = (ticket) => {
    // Generate QR code data
    const qrData = {
      ticketId: ticket.id,
      eventName: ticket.eventName,
      ticketType: ticket.ticketType,
      purchaseDate: ticket.purchaseDate,
      price: ticket.price
    }
    return JSON.stringify(qrData)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '4px solid #f3f4f6',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (!userData) {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}>
                Welcome, {userData.name}!
              </h1>
              <p style={{ color: '#94a3b8' }}>Manage your account and view your tickets</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Logout
            </button>
          </div>

          {/* User Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: 'rgba(55, 65, 81, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>Email</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{userData.email}</p>
            </div>
            <div style={{
              backgroundColor: 'rgba(55, 65, 81, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>Age</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{userData.age}</p>
            </div>
            <div style={{
              backgroundColor: 'rgba(55, 65, 81, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>Account Type</p>
              <p style={{ color: 'white', fontWeight: '500' }}>{userData.source || 'Local'}</p>
            </div>
          </div>
        </div>

        {/* Tickets Section */}
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
            My Tickets ({tickets.length})
          </h2>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{
                width: '6rem',
                height: '6rem',
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <svg style={{ width: '3rem', height: '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                No Tickets Found
              </h3>
              <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                You haven't purchased any tickets yet
              </p>
              <a
                href="/events"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '500'
                }}
              >
                Browse Events
              </a>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} style={{
                  backgroundColor: 'rgba(55, 65, 81, 0.3)',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '4px'
                    }}>
                      {ticket.eventName}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      {ticket.ticketType}
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Price:</span>
                      <span style={{ color: '#22c55e', fontWeight: '500' }}>${ticket.price}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Purchase Date:</span>
                      <span style={{ color: 'white', fontSize: '0.875rem' }}>
                        {new Date(ticket.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Display */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'white',
                      marginBottom: '12px'
                    }}>
                      QR Code for Entry
                    </h4>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCode || JSON.stringify({
                          ticketId: ticket.id,
                          eventName: ticket.eventName,
                          ticketType: ticket.ticketType,
                          purchaseDate: ticket.purchaseDate,
                          price: ticket.price,
                          customerEmail: ticket.customerEmail,
                          customerName: ticket.customerName || ticket.customerEmail.split('@')[0],
                          verificationCode: ticket.verificationCode || 'N/A',
                          ticketValidityDate: ticket.ticketValidityDate || null,
                          ticketValidityStart: ticket.ticketValidityStart || null,
                          ticketValidityEnd: ticket.ticketValidityEnd || null
                        }))}`}
                        alt="QR Code"
                        style={{
                          width: '8rem',
                          height: '8rem',
                          borderRadius: '8px',
                          margin: '0 auto 12px auto',
                          display: 'block'
                        }}
                        onError={(e) => {
                          // 如果二维码加载失败，显示备用图标
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div style={{
                        width: '8rem',
                        height: '8rem',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        margin: '0 auto 12px auto',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg style={{ width: '4rem', height: '4rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {generateQRCode(ticket)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}>
                      Download PDF
                    </button>
                    <button style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: 'rgba(107, 114, 128, 0.2)',
                      color: '#9ca3af',
                      border: '1px solid rgba(107, 114, 128, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.3)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'}>
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}