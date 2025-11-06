'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '../../components/NavbarPartyTix'
import LoginForm from '../../components/LoginForm'
import RegisterForm from '../../components/RegisterForm'
import { createClient } from '@supabase/supabase-js'
import { QRCodeSVG } from 'qrcode.react'
import { getTicketKindDisplayName } from '@/lib/ticket-helpers'

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
  const [ticketsExpanded, setTicketsExpanded] = useState({ unused: true, used: true })
  const [ordersExpanded, setOrdersExpanded] = useState(true)
  const [clickingTickets, setClickingTickets] = useState({}) // Track triple-click state per ticket

  useEffect(() => {
    // Check if user session exists
    const userSession = localStorage.getItem('userSession')
    
    if (!userSession) {
      console.log('No user session found')
      setLoading(false)
      setShowLogin(true)
      return
    }

    // Initialize Supabase client
    if (supabaseUrl && supabaseKey) {
      try {
        console.log('Parsing user session:', userSession)
        const sessionData = JSON.parse(userSession)
        console.log('Parsed session data:', sessionData)
        
        const client = createClient(supabaseUrl, supabaseKey)
        setSupabase(client)
        
        // Use user ID from session to load data
        if (sessionData && sessionData.id) {
          loadUserData(client, sessionData.id)
        } else {
          console.error('❌ No user ID in session data')
          setLoading(false)
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('❌ Failed to parse session:', error, 'Session data:', userSession)
        setLoading(false)
        router.push('/auth/login')
      }
    } else {
      console.error('❌ Supabase not configured')
      setLoading(false)
      router.push('/auth/login')
    }
  }, [router])

  const handleLoginSuccess = (userData) => {
    console.log('✅ handleLoginSuccess called with:', userData)
    setUser(userData)
    setShowLogin(false)
    setShowRegister(false)
    // Reload user data
    if (supabaseUrl && supabaseKey && userData && userData.id) {
      const client = createClient(supabaseUrl, supabaseKey)
      loadUserData(client, userData.id)
    }
  }

  const handleRegisterSuccess = (userData) => {
    setUser(userData)
    setShowLogin(false)
    setShowRegister(false)
      // Reload user data
    if (supabaseUrl && supabaseKey && userData && userData.id) {
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
      // Get user information
      const { data: userData, error: userError } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('❌ Failed to get user information:', userError)
        setLoading(false)
        router.push('/auth/login')
        return
      }

      if (userData) {
        delete userData.password_hash
        
        // Check if email is verified
        if (!userData.email_verified_at) {
          console.log('❌ Email not verified, redirecting to verification page')
          setLoading(false)
          router.push('/auth/verify-email?message=Please verify your email to access your account')
          return
        }
        
        setUser(userData)
      }

      // Get user tickets (filter by user ID, fallback to email)
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
        .or(`user_id.eq.${userData.id},holder_email.eq.${userData.email}`)
        .order('created_at', { ascending: false })

      if (ticketsData) {
        setTickets(ticketsData)
      }

      // Get user orders (filter by email)
      const { data: ordersData } = await client
        .from('orders')
        .select('*')
        .eq('customer_email', userData.email)
        .order('created_at', { ascending: false })

      if (ordersData) {
        setOrders(ordersData)
      }

    } catch (error) {
      console.error('❌ Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    // Clear session
    localStorage.removeItem('userSession')
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('❌ Logout failed:', error)
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

  // Show login form
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

  // Show register form
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Categorize tickets */}
              {(() => {
                const unusedTickets = (tickets || []).filter(t => t.status === 'unused' || !t.status)
                const usedTickets = (tickets || []).filter(t => t.status === 'used')
                
                return (
                  <>
                    {/* Unused Tickets */}
                    {unusedTickets.length > 0 && (
                      <div>
                        <button
                          onClick={() => setTicketsExpanded(prev => ({ ...prev, unused: !prev.unused }))}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            marginBottom: '16px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              background: 'rgba(34, 211, 238, 0.2)',
                              color: '#22D3EE',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              Unused
                            </span>
                            <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                              Unused Tickets ({unusedTickets.length})
                            </span>
                          </div>
                          <span style={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '20px',
                            transform: ticketsExpanded.unused ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                          }}>
                            ▼
                          </span>
                        </button>
                        
                        {ticketsExpanded.unused && (
                          <div style={{ display: 'grid', gap: '20px', paddingLeft: '8px' }}>
                            {unusedTickets.map(ticket => (
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
                        {ticket.ticket_kind && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>🎟️ Type:</span> {getTicketKindDisplayName(ticket.ticket_kind)}
                          </div>
                        )}
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

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <span style={{
                          background: ticket.status === 'used' || ticket.used ? 'rgba(34, 197, 94, 0.2)' : 
                                     ticket.status === 'unused' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: ticket.status === 'used' || ticket.used ? '#22c55e' : 
                                 ticket.status === 'unused' ? '#22D3EE' : '#ef4444',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {ticket.used ? 'Used' : (ticket.status || 'Unknown')}
                        </span>
                        {ticket.orders && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                            💰 ${ticket.orders.total_amount_cents ? (ticket.orders.total_amount_cents / 100).toFixed(2) : '0.00'}
                          </span>
                        )}
                      </div>

                      {/* Triple-click use button - only show for unused tickets */}
                      {!ticket.used && ticket.status !== 'used' && user && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            onClick={async () => {
                              const ticketId = ticket.id
                              const currentClicks = clickingTickets[ticketId] || { count: 0, timeout: null }
                              
                              // Clear previous timeout
                              if (currentClicks.timeout) {
                                clearTimeout(currentClicks.timeout)
                              }
                              
                              // Increment click count
                              const newCount = currentClicks.count + 1
                              
                              // If 3 clicks, use the ticket
                              if (newCount >= 3) {
                                setClickingTickets(prev => ({ ...prev, [ticketId]: { count: 0, timeout: null } }))
                                
                                try {
                                  const response = await fetch('/api/tickets/use', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                      ticket_id: ticketId,
                                      userId: user.id
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  
                                  if (result.success) {
                                    // Update ticket in local state
                                    setTickets(prev => prev.map(t => 
                                      t.id === ticketId 
                                        ? { ...t, used: true, status: 'used', used_at: result.data.used_at }
                                        : t
                                    ))
                                    alert('Ticket has been used successfully!')
                                  } else {
                                    alert(result.message || 'Failed to use ticket')
                                  }
                                } catch (error) {
                                  console.error('Error using ticket:', error)
                                  alert('Failed to use ticket. Please try again.')
                                }
                              } else {
                                // Set timeout to reset after 2 seconds
                                const timeout = setTimeout(() => {
                                  setClickingTickets(prev => {
                                    const updated = { ...prev }
                                    if (updated[ticketId]) {
                                      updated[ticketId].count = 0
                                    }
                                    return updated
                                  })
                                }, 2000)
                                
                                setClickingTickets(prev => ({
                                  ...prev,
                                  [ticketId]: { count: newCount, timeout }
                                }))
                              }
                            }}
                            style={{
                              background: clickingTickets[ticket.id]?.count >= 2
                                ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
                                : 'rgba(124, 58, 237, 0.2)',
                              border: '1px solid rgba(124, 58, 237, 0.5)',
                              color: 'white',
                              padding: '10px 20px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              if (clickingTickets[ticket.id]?.count < 2) {
                                e.target.style.background = 'rgba(124, 58, 237, 0.3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (clickingTickets[ticket.id]?.count < 2) {
                                e.target.style.background = 'rgba(124, 58, 237, 0.2)'
                              }
                            }}
                          >
                            {clickingTickets[ticket.id]?.count === 1
                              ? 'Click 2 more times to use'
                              : clickingTickets[ticket.id]?.count === 2
                              ? 'Click 1 more time to use'
                              : 'Click 3 times to use ticket'}
                          </button>
                        </div>
                      )}
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
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${ticket.short_id || ticket.id}`}
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
                        Scan for Info
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
                    )}
                    
                    {/* Used Tickets */}
                    {usedTickets.length > 0 && (
                      <div>
                        <button
                          onClick={() => setTicketsExpanded(prev => ({ ...prev, used: !prev.used }))}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            marginBottom: '16px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#22c55e',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              Used
                            </span>
                            <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                              Used Tickets ({usedTickets.length})
                            </span>
                          </div>
                          <span style={{ 
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '20px',
                            transform: ticketsExpanded.used ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                          }}>
                            ▼
                          </span>
                        </button>
                        
                        {ticketsExpanded.used && (
                          <div style={{ display: 'grid', gap: '20px', paddingLeft: '8px' }}>
                            {usedTickets.map(ticket => (
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
                                    minWidth: '180px',
                                    opacity: ticket.status === 'used' ? 0.6 : 1
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
                                      {ticket.status === 'used' ? 'Used' : 'Scan for Entry'}
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
                    )}
                  </>
                )
              })()}
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
            <button
              onClick={() => setOrdersExpanded(!ordersExpanded)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                padding: '0',
                marginBottom: '20px',
                cursor: 'pointer'
              }}
            >
              <h2 style={{ 
                color: 'white', 
                fontSize: '20px',
                margin: 0
              }}>
                Purchase History ({orders?.length || 0})
              </h2>
              <span style={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
                transform: ordersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>
            
            {ordersExpanded && (
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}