'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '../../components/NavbarPartyTix'
import LoginForm from '../../components/LoginForm'
import RegisterForm from '../../components/RegisterForm'
import { createClient } from '@supabase/supabase-js'
import { QRCodeSVG } from 'qrcode.react'
import { getTicketKindDisplayName, getTicketKindCategoryName } from '@/lib/ticket-helpers'

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
  const [ticketsExpanded, setTicketsExpanded] = useState({
    // Structure: { 'Entry Tickets': { categoryExpanded: true, unused: true, used: false }, 'Drink Tickets': { categoryExpanded: true, unused: true, used: false }, etc. }
    // unused: true (expanded by default), used: false (collapsed by default)
    'Entry Tickets': { categoryExpanded: true, unused: true, used: false },
    'Drink Tickets': { categoryExpanded: true, unused: true, used: false },
    'Queue Pass': { categoryExpanded: true, unused: true, used: false },
    'Other': { categoryExpanded: true, unused: true, used: false }
  })
  const [ordersExpanded, setOrdersExpanded] = useState(true)
  const [clickingTickets, setClickingTickets] = useState({}) // Track triple-click state per ticket
  const [showProfileDetails, setShowProfileDetails] = useState(false) // Show profile edit modal
  const [editingProfile, setEditingProfile] = useState(false) // Edit mode for profile
  const [profileData, setProfileData] = useState({ name: '', email: '', age: '' }) // Profile form data
  const [showTicketsModal, setShowTicketsModal] = useState(false) // Show tickets modal
  const [showOrdersModal, setShowOrdersModal] = useState(false) // Show orders modal
  const [resendingVerification, setResendingVerification] = useState(false) // Resending verification email
  const [verificationMessage, setVerificationMessage] = useState('') // Verification message

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
        const hasPassword = !!userData.password_hash

        delete userData.password_hash

        // Track password setup status for Google OAuth users
        userData.has_password = hasPassword
        userData.requires_password_setup = userData.auth_provider === 'google' && !hasPassword

        // Persist password status in local session (if available)
        try {
          const existingSession = localStorage.getItem('userSession')
          if (existingSession) {
            const parsedSession = JSON.parse(existingSession)
            parsedSession.has_password = hasPassword
            parsedSession.requires_password_setup = userData.requires_password_setup
            localStorage.setItem('userSession', JSON.stringify(parsedSession))
          }
        } catch (error) {
          console.warn('⚠️ Failed to persist password status to session storage:', error)
        }

        // Allow access even if email is not verified
        // Email verification is optional unless REQUIRE_EMAIL_VERIFICATION=true
        // We'll show a banner reminder instead of blocking access

        setUser(userData)
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          age: userData.age || ''
        })
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

  const handleResendVerification = async () => {
    if (!user?.email) return
    
    setResendingVerification(true)
    setVerificationMessage('')
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      })
      
      const result = await response.json()
      
      // Check response status first
      if (response.status === 429) {
        // Rate limit error
        let message = result.details || result.message || 'Too many requests. Please wait before trying again.'
        
        // Add retry time if available (check both result.retryAfter and result.details.retryAfter)
        const retryAfter = result.retryAfter || result.details?.retryAfter
        if (retryAfter) {
          const retryDate = new Date(retryAfter)
          const now = new Date()
          const minutesLeft = Math.ceil((retryDate - now) / (1000 * 60))
          
          if (minutesLeft > 0) {
            message = `Too many requests. Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before trying again.`
          } else {
            message = 'Too many requests. Please wait a moment before trying again.'
          }
        }
        
        setVerificationMessage(message)
        return
      }
      
      if (response.status === 403) {
        // Forbidden error
        setVerificationMessage(result.details || result.message || 'Access denied. Please check your account permissions.')
        return
      }
      
      if (response.status === 404) {
        // User not found
        setVerificationMessage(result.details || result.message || 'User not found. Please contact support.')
        return
      }
      
      if (response.status >= 500) {
        // Server error
        setVerificationMessage(result.details || result.message || 'Server error. Please try again later or contact support.')
        return
      }
      
      // Success case
      if (result.success || response.ok) {
        setVerificationMessage(result.message || 'Verification email has been resent, please check your inbox')
      } else {
        // Other error cases
        setVerificationMessage(result.details || result.message || 'Failed to send, please try again later')
      }
    } catch (error) {
      console.error('Error resending verification email:', error)
      setVerificationMessage('Network error, please try again later')
    } finally {
      setResendingVerification(false)
    }
  }

  const handleSetPasswordReminder = () => {
    router.push('/auth/forgot-password')
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
          marginBottom: '24px'
        }}>
            <h1 style={{
            fontSize: '28px', 
              fontWeight: 'bold',
              color: 'white',
            margin: 0
            }}>
            Account
            </h1>
        </div>

        {/* Email Verification Banner - Only show if email is not verified and not Google OAuth user */}
        {user && !user.email_verified_at && user.auth_provider !== 'google' && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.15)',
            border: '2px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                fontSize: '24px',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                ⚠️
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: '#fbbf24',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Email Verification Required
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  marginBottom: '12px'
                }}>
                  Your email address has not been verified. Please verify your email to protect your account and receive event notifications.
                </p>
                {verificationMessage && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    background: verificationMessage.includes('resent') || verificationMessage.includes('sent')
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                    color: verificationMessage.includes('resent') || verificationMessage.includes('sent')
                      ? '#22c55e'
                      : '#ef4444',
                    border: `1px solid ${verificationMessage.includes('resent') || verificationMessage.includes('sent')
                      ? 'rgba(34, 197, 94, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {verificationMessage}
                  </div>
                )}
                <button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  style={{
                    background: resendingVerification 
                      ? 'rgba(251, 191, 36, 0.3)' 
                      : 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.5)',
                    color: '#fbbf24',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: resendingVerification ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: resendingVerification ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!resendingVerification) {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!resendingVerification) {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'
                    }
                  }}
                >
                  {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google OAuth users without password - prompt to set password */}
        {user && user.auth_provider === 'google' && (user.requires_password_setup || user.has_password === false) && (
          <div style={{
            background: 'rgba(96, 165, 250, 0.15)',
            border: '2px solid rgba(96, 165, 250, 0.4)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px rgba(96, 165, 250, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                fontSize: '24px',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                🔐
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: '#60a5fa',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Set a Password for Backup Login
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  marginBottom: '12px'
                }}>
                  You signed in with Google and haven&#39;t created a password yet. Adding a password lets you log in by email if Google is unavailable and keeps your account more secure.
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <button
                    onClick={handleSetPasswordReminder}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 18px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    Set Password Now
                  </button>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    We will send a password setup link to <strong>{user.email}</strong>. Follow the instructions in the email to create your password.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            {/* Avatar */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            
            {/* User Info */}
            <div style={{ flex: 1 }}>
              <h2 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '4px',
                textTransform: 'capitalize'
              }}>
                {user?.name || 'User'}
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                margin: 0
              }}>
                {user?.email || 'No email'}
            </p>
          </div>
          </div>
          
          {/* View My Profile Button */}
            <button
            onClick={() => setShowProfileDetails(true)}
              style={{
              width: '100%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)',
                color: 'white',
                border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
                fontWeight: '600',
              cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            View My Profile
            </button>
        </div>

        {/* Shortcuts Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Shortcuts
          </h3>
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px'
          }}>
            {/* My Tickets */}
            <button
              onClick={() => setShowTicketsModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🎫
          </div>
              <span style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                My Tickets
              </span>
            </button>

            {/* Order History */}
            <button
              onClick={() => setShowOrdersModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📋
            </div>
              <span style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Order History
              </span>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                // Settings functionality to be added later
                alert('Settings feature coming soon!')
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(107, 114, 128, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                ⚙️
            </div>
              <span style={{ 
                color: 'white', 
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Settings
              </span>
            </button>
            </div>
          </div>

        {/* Logout Button */}
        <div style={{ marginTop: '40px', marginBottom: '20px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
            }}
          >
            Logout
          </button>
        </div>

        {/* My Tickets Section - Hidden, content moved to modal */}
        <div id="tickets-section" style={{ display: 'none' }}>
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
              {/* Categorize tickets by kind first, then by usage status */}
              {(() => {
                // Group tickets by category
                const ticketsByCategory = {}
                
                ;(tickets || []).forEach(ticket => {
                  const category = getTicketKindCategoryName(ticket.ticket_kind)
                  if (!ticketsByCategory[category]) {
                    ticketsByCategory[category] = { unused: [], used: [] }
                  }
                  
                  // Check if ticket is used
                  const isUsed = ticket.used || ticket.status === 'used'
                  if (isUsed) {
                    ticketsByCategory[category].used.push(ticket)
                  } else {
                    ticketsByCategory[category].unused.push(ticket)
                  }
                })
                
                // Define category order and colors
                const categoryOrder = ['Entry Tickets', 'Drink Tickets', 'Queue Pass', 'Other']
                const categoryColors = {
                  'Entry Tickets': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
                  'Drink Tickets': { bg: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' },
                  'Queue Pass': { bg: 'rgba(236, 72, 153, 0.2)', color: '#ec4899' },
                  'Other': { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }
                }
                
                return (
                  <>
                    {categoryOrder.map(category => {
                      const categoryTickets = ticketsByCategory[category]
                      if (!categoryTickets || (categoryTickets.unused.length === 0 && categoryTickets.used.length === 0)) {
                        return null
                      }
                      
                      const totalCount = categoryTickets.unused.length + categoryTickets.used.length
                      const categoryColor = categoryColors[category] || categoryColors['Other']
                      
                      return (
                        <div key={category} style={{ marginBottom: '24px' }}>
                          {/* Category Header */}
                          <button
                            onClick={() => setTicketsExpanded(prev => ({
                              ...prev,
                              [category]: {
                                ...prev[category],
                                categoryExpanded: !prev[category]?.categoryExpanded
                              }
                            }))}
                            style={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: categoryColor.bg,
                              border: `1px solid ${categoryColor.color}40`,
                              borderRadius: '12px',
                              padding: '16px 20px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              marginBottom: '12px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.9'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ 
                                background: categoryColor.color,
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                {category}
                              </span>
                              <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                                {category} ({totalCount})
                              </span>
                            </div>
                            <span style={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '20px',
                              transform: ticketsExpanded[category]?.categoryExpanded !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s ease'
                            }}>
                              ▼
                            </span>
                          </button>
                          
                          {/* Category Content */}
                          {ticketsExpanded[category]?.categoryExpanded !== false && (
                            <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Unused Tickets in this category */}
                              {categoryTickets.unused.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => setTicketsExpanded(prev => ({
                                      ...prev,
                                      [category]: {
                                        ...prev[category],
                                        unused: !prev[category]?.unused
                                      }
                                    }))}
                                    style={{
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '12px',
                                      padding: '12px 16px',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      marginBottom: '12px'
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
                                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                        Unused ({categoryTickets.unused.length})
                                      </span>
                                    </div>
                                    <span style={{ 
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '18px',
                                      transform: ticketsExpanded[category]?.unused !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.3s ease'
                                    }}>
                                      ▼
                                    </span>
                                  </button>
                                  
                                  {ticketsExpanded[category]?.unused !== false && (
                                    <div style={{ display: 'grid', gap: '16px', paddingLeft: '8px' }}>
                                      {categoryTickets.unused.map(ticket => (
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
                        {ticket.event_title_snapshot || ticket.events?.title || 'Event Ticket'}
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
                        {(ticket.event_start_at_snapshot || ticket.events?.start_at) && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Date:</span> {new Date(ticket.event_start_at_snapshot || ticket.events.start_at).toLocaleDateString()}
                          </div>
                        )}
                        {(ticket.event_venue_snapshot || ticket.events?.venue_name) && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📍 Venue:</span> {ticket.event_venue_snapshot || ticket.events.venue_name}
                          </div>
                        )}
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Issued:</span> {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                        {ticket.price_amount_cents_snapshot && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>💰 Price:</span> ${(ticket.price_amount_cents_snapshot / 100).toFixed(2)}
                          </div>
                        )}
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
                              
                              {/* Used Tickets in this category */}
                              {categoryTickets.used.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => setTicketsExpanded(prev => ({
                                      ...prev,
                                      [category]: {
                                        ...prev[category],
                                        used: !prev[category]?.used
                                      }
                                    }))}
                                    style={{
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '12px',
                                      padding: '12px 16px',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      marginBottom: '12px'
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
                                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                        Used ({categoryTickets.used.length})
                                      </span>
                                    </div>
                                    <span style={{ 
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '18px',
                                      transform: ticketsExpanded[category]?.used !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.3s ease'
                                    }}>
                                      ▼
                                    </span>
                                  </button>
                                  
                                  {ticketsExpanded[category]?.used !== false && (
                                    <div style={{ display: 'grid', gap: '16px', paddingLeft: '8px' }}>
                                      {categoryTickets.used.map(ticket => (
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
                                                {ticket.event_title_snapshot || ticket.events?.title || 'Event Ticket'}
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
                                                {(ticket.event_start_at_snapshot || ticket.events?.start_at) && (
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Date:</span> {new Date(ticket.event_start_at_snapshot || ticket.events.start_at).toLocaleDateString()}
                                                  </div>
                                                )}
                                                {(ticket.event_venue_snapshot || ticket.events?.venue_name) && (
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📍 Venue:</span> {ticket.event_venue_snapshot || ticket.events.venue_name}
                                                  </div>
                                                )}
                                                {ticket.price_amount_cents_snapshot && (
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>💰 Price:</span> ${(ticket.price_amount_cents_snapshot / 100).toFixed(2)}
                                                  </div>
                                                )}
                                                <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Issued:</span> {new Date(ticket.created_at).toLocaleDateString()}
                                                </div>
                                                {ticket.used_at && (
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>✅ Used:</span> {new Date(ticket.used_at).toLocaleDateString()}
                                                  </div>
                                                )}
                                              </div>

                                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                <span style={{
                                                  background: 'rgba(34, 197, 94, 0.2)',
                                                  color: '#22c55e',
                                                  padding: '6px 12px',
                                                  borderRadius: '6px',
                                                  fontSize: '13px',
                                                  fontWeight: '500',
                                                  textTransform: 'capitalize'
                                                }}>
                                                  已使用
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
                                              opacity: ticket.used || ticket.status === 'used' ? 0.6 : 1
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
                            </div>
                          )}
                        </div>
                      )
                    })}
                    </>
                  )
                })()}
            </div>
          )}
        </div>

      </div>

      {/* My Tickets Modal */}
      {showTicketsModal && (
          <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowTicketsModal(false)
          }
        }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '900px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                margin: 0
              }}>
                My Tickets ({tickets?.length || 0})
              </h2>
            <button
                onClick={() => setShowTicketsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Tickets Content */}
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
                {(() => {
                  // Group tickets by category
                  const ticketsByCategory = {}
                  
                  ;(tickets || []).forEach(ticket => {
                    const category = getTicketKindCategoryName(ticket.ticket_kind)
                    if (!ticketsByCategory[category]) {
                      ticketsByCategory[category] = { unused: [], used: [] }
                    }
                    
                    // Check if ticket is used
                    const isUsed = ticket.used || ticket.status === 'used'
                    if (isUsed) {
                      ticketsByCategory[category].used.push(ticket)
                    } else {
                      ticketsByCategory[category].unused.push(ticket)
                    }
                  })
                  
                  // Define category order and colors
                  const categoryOrder = ['Entry Tickets', 'Drink Tickets', 'Queue Pass', 'Other']
                  const categoryColors = {
                    'Entry Tickets': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
                    'Drink Tickets': { bg: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' },
                    'Queue Pass': { bg: 'rgba(236, 72, 153, 0.2)', color: '#ec4899' },
                    'Other': { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }
                  }
                  
                  return (
                    <>
                      {categoryOrder.map(category => {
                        const categoryTickets = ticketsByCategory[category]
                        if (!categoryTickets || (categoryTickets.unused.length === 0 && categoryTickets.used.length === 0)) {
                          return null
                        }
                        
                        const totalCount = categoryTickets.unused.length + categoryTickets.used.length
                        const categoryColor = categoryColors[category] || categoryColors['Other']
                        
                        return (
                          <div key={category} style={{ marginBottom: '24px' }}>
                            {/* Category Header */}
                            <button
                              onClick={() => setTicketsExpanded(prev => ({
                                ...prev,
                                [category]: {
                                  ...prev[category],
                                  categoryExpanded: !prev[category]?.categoryExpanded
                                }
                              }))}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                                background: categoryColor.bg,
                                border: `1px solid ${categoryColor.color}40`,
                                borderRadius: '12px',
                                padding: '16px 20px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                marginBottom: '12px'
              }}
            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                  background: categoryColor.color,
                color: 'white', 
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: '600'
              }}>
                                  {category}
                                </span>
                                <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
                                  {category} ({totalCount})
                                </span>
                              </div>
              <span style={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
                                transform: ticketsExpanded[category]?.categoryExpanded !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </button>
            
                            {/* Category Content */}
                            {ticketsExpanded[category]?.categoryExpanded !== false && (
                              <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Unused Tickets in this category */}
                                {categoryTickets.unused.length > 0 && (
                                  <div>
                                    <button
                                      onClick={() => setTicketsExpanded(prev => ({
                                        ...prev,
                                        [category]: {
                                          ...prev[category],
                                          unused: !prev[category]?.unused
                                        }
                                      }))}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        marginBottom: '12px'
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
                                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                          Unused ({categoryTickets.unused.length})
                                        </span>
                                      </div>
                                      <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '18px',
                                        transform: ticketsExpanded[category]?.unused !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease'
                                      }}>
                                        ▼
                                      </span>
                                    </button>
                                    
                                    {ticketsExpanded[category]?.unused !== false && (
                                      <div style={{ display: 'grid', gap: '16px', paddingLeft: '8px' }}>
                                        {categoryTickets.unused.map(ticket => (
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
                                                  {ticket.event_title_snapshot || ticket.events?.title || 'Event Ticket'}
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
                                                  {(ticket.event_start_at_snapshot || ticket.events?.start_at) && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Date:</span> {new Date(ticket.event_start_at_snapshot || ticket.events.start_at).toLocaleDateString()}
                                                    </div>
                                                  )}
                                                  {(ticket.event_venue_snapshot || ticket.events?.venue_name) && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📍 Venue:</span> {ticket.event_venue_snapshot || ticket.events.venue_name}
                                                    </div>
                                                  )}
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Issued:</span> {new Date(ticket.created_at).toLocaleDateString()}
                                                  </div>
                                                  {ticket.price_amount_cents_snapshot && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>💰 Price:</span> ${(ticket.price_amount_cents_snapshot / 100).toFixed(2)}
                                                    </div>
                                                  )}
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

                                                {/* Triple-click use button */}
                                                {!ticket.used && ticket.status !== 'used' && user && (
                                                  <div style={{ marginTop: '12px' }}>
                                                    <button
                                                      onClick={async () => {
                                                        const ticketId = ticket.id
                                                        const currentClicks = clickingTickets[ticketId] || { count: 0, timeout: null }
                                                        
                                                        if (currentClicks.timeout) {
                                                          clearTimeout(currentClicks.timeout)
                                                        }
                                                        
                                                        const newCount = currentClicks.count + 1
                                                        
                                                        if (newCount >= 3) {
                                                          setClickingTickets(prev => ({ ...prev, [ticketId]: { count: 0, timeout: null } }))
                                                          
                                                          try {
                                                            const response = await fetch('/api/tickets/use', {
                                                              method: 'POST',
                                                              headers: { 'Content-Type': 'application/json' },
                                                              body: JSON.stringify({ ticket_id: ticketId, userId: user.id })
                                                            })
                                                            
                                                            const result = await response.json()
                                                            
                                                            if (result.success) {
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
                                
                                {/* Used Tickets in this category */}
                                {categoryTickets.used.length > 0 && (
                                  <div>
                                    <button
                                      onClick={() => setTicketsExpanded(prev => ({
                                        ...prev,
                                        [category]: {
                                          ...prev[category],
                                          used: !prev[category]?.used
                                        }
                                      }))}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        marginBottom: '12px'
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
                                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                          Used ({categoryTickets.used.length})
                                        </span>
                                      </div>
                                      <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '18px',
                                        transform: ticketsExpanded[category]?.used !== false ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease'
                                      }}>
                                        ▼
                                      </span>
                                    </button>
                                    
                                    {ticketsExpanded[category]?.used !== false && (
                                      <div style={{ display: 'grid', gap: '16px', paddingLeft: '8px' }}>
                                        {categoryTickets.used.map(ticket => (
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
                                                  {ticket.event_title_snapshot || ticket.events?.title || 'Event Ticket'}
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
                                                  {(ticket.event_start_at_snapshot || ticket.events?.start_at) && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Date:</span> {new Date(ticket.event_start_at_snapshot || ticket.events.start_at).toLocaleDateString()}
                                                    </div>
                                                  )}
                                                  {(ticket.event_venue_snapshot || ticket.events?.venue_name) && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📍 Venue:</span> {ticket.event_venue_snapshot || ticket.events.venue_name}
                                                    </div>
                                                  )}
                                                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>📅 Issued:</span> {new Date(ticket.created_at).toLocaleDateString()}
                                                  </div>
                                                  {ticket.used_at && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>✅ Used:</span> {new Date(ticket.used_at).toLocaleDateString()}
                                                    </div>
                                                  )}
                                                  {ticket.price_amount_cents_snapshot && (
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>💰 Price:</span> ${(ticket.price_amount_cents_snapshot / 100).toFixed(2)}
                                                    </div>
                                                  )}
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                  <span style={{
                                                    background: 'rgba(34, 197, 94, 0.2)',
                                                    color: '#22c55e',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    textTransform: 'capitalize'
                                                  }}>
                                                    Used
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
                                                opacity: 0.6
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
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showOrdersModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowOrdersModal(false)
          }
        }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '900px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                margin: 0
              }}>
                Purchase History ({orders?.length || 0})
              </h2>
              <button
                onClick={() => setShowOrdersModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Orders Content */}
            {(orders?.length || 0) === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '40px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No orders yet</div>
                <div style={{ fontSize: '14px' }}>Your purchase history will appear here</div>
              </div>
            ) : (
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
          </div>
        )}

      {/* Profile Details Modal */}
      {showProfileDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowProfileDetails(false)
            setEditingProfile(false)
          }
        }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                margin: 0
              }}>
                My Profile
              </h2>
              <button
                onClick={() => {
                  setShowProfileDetails(false)
                  setEditingProfile(false)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
      </div>

            {/* Profile Content */}
            {!editingProfile ? (
              // View Mode
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'rgba(124, 58, 237, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      fontWeight: 'bold',
                      color: 'white',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                    </div>
                    <div>
                      <h3 style={{
                        color: 'white',
                        fontSize: '22px',
                        fontWeight: '600',
                        marginBottom: '4px',
                        textTransform: 'capitalize'
                      }}>
                        {user?.name || 'User'}
                      </h3>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        margin: 0
                      }}>
                        {user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Name
                    </label>
                    <div style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {user?.name || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Email
                    </label>
                    <div style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {user?.email || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Age
                    </label>
                    <div style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {user?.age || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Role
                    </label>
                    <div style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      textTransform: 'capitalize'
                    }}>
                      {user?.role || 'User'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingProfile(true)}
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              // Edit Mode
              <div>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      Age
                    </label>
                    <input
                      type="number"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                      placeholder="Enter your age"
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={async () => {
                      try {
                        if (!supabase || !user?.id) return
                        
                        const { error } = await supabase
                          .from('users')
                          .update({
                            name: profileData.name,
                            email: profileData.email,
                            age: profileData.age ? parseInt(profileData.age) : null
                          })
                          .eq('id', user.id)
                        
                        if (error) {
                          alert('Failed to update profile: ' + error.message)
                          return
                        }
                        
                        // Update local user state
                        setUser({
                          ...user,
                          name: profileData.name,
                          email: profileData.email,
                          age: profileData.age ? parseInt(profileData.age) : null
                        })
                        
                        // Update session
                        const sessionData = JSON.parse(localStorage.getItem('userSession') || '{}')
                        sessionData.name = profileData.name
                        sessionData.email = profileData.email
                        sessionData.age = profileData.age ? parseInt(profileData.age) : null
                        localStorage.setItem('userSession', JSON.stringify(sessionData))
                        
                        setEditingProfile(false)
                        alert('Profile updated successfully!')
                      } catch (error) {
                        console.error('Error updating profile:', error)
                        alert('Failed to update profile')
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false)
                      setProfileData({
                        name: user?.name || '',
                        email: user?.email || '',
                        age: user?.age || ''
                      })
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}