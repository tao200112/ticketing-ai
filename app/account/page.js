'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '../../components/NavbarPartyTix'
import LoginForm from '../../components/LoginForm'
import RegisterForm from '../../components/RegisterForm'
import { createClient } from '@supabase/supabase-js'
import { QRCodeSVG } from 'qrcode.react'
import { getTicketKindDisplayName, getTicketKindCategoryName, getTicketRedemptionLocation, isTicketActive } from '@/lib/ticket-helpers'
import { requiresPasswordSetup } from '@/lib/auth/password-placeholder'

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
  const [ordersExpanded, setOrdersExpanded] = useState(true)
  // Redemption state: track tap-tap-slide flow per ticket
  const [redemptionState, setRedemptionState] = useState({}) // { ticketId: { state: 'idle'|'warning'|'confirm'|'redeeming'|'redeemed', timestamp: number } }
  const [activeTab, setActiveTab] = useState('entry') // 'entry', 'drink', 'other'
  const [showQRCodes, setShowQRCodes] = useState({}) // { ticketId: boolean } - Track which tickets show QR codes
  const [showActiveSection, setShowActiveSection] = useState(false) // Collapsible state for Active section
  const [showUsedSection, setShowUsedSection] = useState(false) // Collapsible state for Used section
  const [showProfileDetails, setShowProfileDetails] = useState(false) // Show profile edit modal
  const [editingProfile, setEditingProfile] = useState(false) // Edit mode for profile
  const [profileData, setProfileData] = useState({ name: '', email: '', age: '' }) // Profile form data
  const [showTicketsModal, setShowTicketsModal] = useState(false) // Show tickets modal
  const [showOrdersModal, setShowOrdersModal] = useState(false) // Show orders modal
  const [resendingVerification, setResendingVerification] = useState(false) // Resending verification email
  const [verificationMessage, setVerificationMessage] = useState('') // Verification message

  useEffect(() => {
    // Initialize Supabase client and check session
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabase(client)
      
      // Check if returning from update-password page (refresh user data)
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('password_updated') === 'true') {
        // Clear the query parameter
        window.history.replaceState({}, '', '/account')
      }
      
      // Get session from Supabase (this also sets cookies for server-side access)
      client.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('❌ Failed to get session:', error)
          setLoading(false)
          setShowLogin(true)
          return
        }
        
        if (!session || !session.user) {
          console.log('No active session found')
          setLoading(false)
          setShowLogin(true)
          return
        }
        
        console.log('✅ Active session found:', session.user.id)
        
        // Store session in localStorage for backward compatibility
        try {
          const sessionData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.display_name || session.user.email,
            role: session.user.user_metadata?.role || 'user',
            age: session.user.user_metadata?.age || null,
          }
          localStorage.setItem('userSession', JSON.stringify(sessionData))
        } catch (storageError) {
          console.warn('⚠️ Failed to store session in localStorage:', storageError)
        }
        
        // Load user data (force refresh if returning from password update)
        const urlParams = new URLSearchParams(window.location.search)
        const forceRefresh = urlParams.get('password_updated') === 'true'
        loadUserData(client, session.user.id, forceRefresh)
      }).catch((error) => {
        console.error('❌ Error getting session:', error)
        setLoading(false)
        setShowLogin(true)
      })
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

  const loadUserData = async (client, userId, forceRefresh = false) => {
    try {
      // Get user information from users table
      let { data: userData, error: userError } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      // If user not found in users table, try to sync from auth via API
      if (userError && userError.code === 'PGRST116') {
        console.log('⚠️ User not found in users table, attempting to sync from auth...')
        
        try {
          // Call sync API to create/update user record
          const syncResponse = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!syncResponse.ok) {
            const errorData = await syncResponse.json()
            console.error('❌ Failed to sync user:', errorData)
            
            // If sync fails due to auth, redirect to login
            if (syncResponse.status === 401) {
              setLoading(false)
              router.push('/auth/login')
              return
            }
            
            // For other errors, try to continue with auth user data
            const { data: { user: authUser }, error: authError } = await client.auth.getUser()
            if (!authError && authUser) {
              const metadata = authUser.user_metadata || {}
              userData = {
                id: authUser.id,
                email: authUser.email,
                name: metadata.full_name || metadata.name || metadata.display_name || authUser.email || 'User',
                role: metadata.role || 'user',
                age: metadata.age || null,
                auth_provider: authUser.app_metadata?.provider || 'email',
                email_verified_at: authUser.email_confirmed_at || authUser.confirmed_at || null
              }
              console.log('⚠️ Using auth user data as fallback after sync failure')
            } else {
              setLoading(false)
              router.push('/auth/login')
              return
            }
          } else {
            const syncData = await syncResponse.json()
            if (syncData.ok && syncData.user) {
              userData = syncData.user
              console.log('✅ Successfully synced user record from auth')
            } else {
              console.error('❌ Sync API returned error:', syncData)
              setLoading(false)
              router.push('/auth/login')
              return
            }
          }
        } catch (syncError) {
          console.error('❌ Error syncing user:', syncError)
          // Try to continue with auth user data as fallback
          try {
            const { data: { user: authUser }, error: authError } = await client.auth.getUser()
            if (!authError && authUser) {
              const metadata = authUser.user_metadata || {}
              userData = {
                id: authUser.id,
                email: authUser.email,
                name: metadata.full_name || metadata.name || metadata.display_name || authUser.email || 'User',
                role: metadata.role || 'user',
                age: metadata.age || null,
                auth_provider: authUser.app_metadata?.provider || 'email',
                email_verified_at: authUser.email_confirmed_at || authUser.confirmed_at || null
              }
              console.log('⚠️ Using auth user data as fallback after sync error')
            } else {
              setLoading(false)
              router.push('/auth/login')
              return
            }
          } catch (authFallbackError) {
            console.error('❌ Failed to get auth user as fallback:', authFallbackError)
            setLoading(false)
            router.push('/auth/login')
            return
          }
        }
      } else if (userError) {
        console.error('❌ Failed to get user information:', userError)
        setLoading(false)
        router.push('/auth/login')
        return
      }

      if (userData) {
        // Get auth user to check has_password from user_metadata
        // Always fetch fresh auth user data, especially after password update
        let authUser = null
        try {
          const { data: { user: authUserData }, error: authError } = await client.auth.getUser()
          if (!authError && authUserData) {
            authUser = authUserData
            // Log for debugging
            console.log('Account page - Loaded auth user:', {
              provider: authUserData.app_metadata?.provider,
              has_password: authUserData.user_metadata?.has_password,
              forceRefresh
            })
          }
        } catch (authErr) {
          console.warn('⚠️ Failed to get auth user for has_password check:', authErr)
        }

        // Check has_password from user_metadata (preferred) or fallback to password_hash check
        const hasPasswordFromMetadata = authUser?.user_metadata?.has_password === true
        const requiresPassword = requiresPasswordSetup(userData)
        const hasPasswordFromHash = !!userData.password_hash && !requiresPassword
        const hasPassword = hasPasswordFromMetadata || hasPasswordFromHash

        delete userData.password_hash

        // Track password setup status for Google OAuth users
        userData.has_password = hasPassword
        userData.requires_password_setup = requiresPassword
        // Store auth_user for later use
        if (authUser) {
          userData.auth_user = authUser
        }

        // Persist password status in local session (if available)
        try {
          const existingSession = localStorage.getItem('userSession')
          if (existingSession) {
            const parsedSession = JSON.parse(existingSession)
            parsedSession.has_password = hasPassword
            parsedSession.requires_password_setup = requiresPassword
            localStorage.setItem('userSession', JSON.stringify(parsedSession))
          }
        } catch (error) {
          console.warn('⚠️ Failed to persist password status to session storage:', error)
        }

        // Allow access even if email is not verified
        // Email verification is optional unless REQUIRE_EMAIL_VERIFICATION=true
        // We'll show a banner reminder instead of blocking access

        // Refresh auth user data when setting user to ensure latest has_password status
        if (userData.auth_user) {
          // Force refresh auth user to get latest metadata
          try {
            const { data: { user: latestAuthUser }, error: refreshError } = await client.auth.getUser()
            if (!refreshError && latestAuthUser) {
              userData.auth_user = latestAuthUser
              // Update has_password from latest auth user
              userData.has_password = latestAuthUser.user_metadata?.has_password === true
            }
          } catch (refreshErr) {
            console.warn('⚠️ Failed to refresh auth user:', refreshErr)
          }
        }
        
        setUser(userData)
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          age: userData.age || ''
        })
      }

      // 获取当前登录用户的 Supabase Auth UID
      let supabaseUid = null
      try {
        const { data: { user: authUser }, error: authError } = await client.auth.getUser()
        if (!authError && authUser) {
          supabaseUid = authUser.id
          console.log('🔍 Account Page - Auth UID:', supabaseUid)
        } else {
          console.error('❌ Failed to get Auth UID:', authError)
        }
      } catch (authErr) {
        console.error('❌ Error getting Auth UID:', authErr)
      }

      if (!supabaseUid) {
        console.error('❌ No Supabase UID available, cannot query tickets/orders')
        setTickets([])
        setOrders([])
        return
      }

      // Get user tickets (只使用 supabase_uid)
      const { data: ticketsData, error: ticketsError } = await client
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
        .eq('supabase_uid', supabaseUid)
        .order('created_at', { ascending: false })

      if (ticketsError) {
        console.error('❌ Failed to fetch tickets:', ticketsError)
        setTickets([])
      } else {
        console.log('🎫 Account Page - Tickets returned:', ticketsData?.length || 0, ticketsData || [])
        setTickets(ticketsData || [])
      }

      // Get user orders (只使用 supabase_uid)
      const { data: ordersData, error: ordersError } = await client
        .from('orders')
        .select('*')
        .eq('supabase_uid', supabaseUid)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('❌ Failed to fetch orders:', ordersError)
        setOrders([])
      } else {
        console.log('📦 Account Page - Orders returned:', ordersData?.length || 0, ordersData || [])
        setOrders(ordersData || [])
      }

      // 调试日志：打印当前用户信息
      console.log('👤 Account Page - Current User Info:', {
        id: userData.id,
        email: userData.email,
        supabase_uid: supabaseUid,
        has_tickets: ticketsData?.length > 0,
        has_orders: ordersData?.length > 0
      })

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

  // Tap-tap-slide redemption handlers - state machine: idle -> warning -> confirm -> redeeming -> redeemed
  const handleRedemptionTap = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket || !isTicketActive(ticket)) {
      return // Don't allow redemption if ticket is already used
    }

    const now = Date.now()
    const currentState = redemptionState[ticketId] || { state: 'idle', timestamp: 0 }
    
    // Reset if more than 10 seconds have passed
    if (currentState.timestamp && (now - currentState.timestamp > 10000)) {
      setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'idle', timestamp: 0 } }))
      return
    }
    
    // State machine transitions
    if (currentState.state === 'idle') {
      // First tap: show warning
      setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'warning', timestamp: now } }))
    } else if (currentState.state === 'warning') {
      // Second tap: show confirmation
      setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'confirm', timestamp: now } }))
    }
    // If already in 'confirm' or 'redeeming' state, do nothing (wait for long-press)
  }

  const handleRedemptionLongPress = async (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket || !user || !isTicketActive(ticket)) {
      return
    }

    const currentState = redemptionState[ticketId]
    // Only allow redemption if we're in 'confirm' state
    if (currentState?.state !== 'confirm') {
      return
    }

    // Set state to 'redeeming' while API call is in progress
    setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'redeeming', timestamp: Date.now() } }))

    try {
      const response = await fetch('/api/tickets/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        // Set state to 'redeemed'
        setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'redeemed', timestamp: Date.now() } }))
      } else {
        // On failure, revert to 'confirm' state
        setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'confirm', timestamp: Date.now() } }))
        alert(result.message || 'Failed to redeem ticket')
      }
    } catch (error) {
      console.error('Error redeeming ticket:', error)
      // On error, revert to 'confirm' state
      setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'confirm', timestamp: Date.now() } }))
      alert('Failed to redeem ticket. Please try again.')
    }
  }

  const resetRedemptionState = (ticketId) => {
    setRedemptionState(prev => ({ ...prev, [ticketId]: { state: 'idle', timestamp: 0 } }))
  }

  const toggleQRCode = (ticketId) => {
    setShowQRCodes(prev => ({ ...prev, [ticketId]: !prev[ticketId] }))
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
        {(() => {
          // Get latest auth user to check has_password status
          const authUser = user?.auth_user || null
          const provider = authUser?.app_metadata?.provider || user?.auth_provider || null
          const hasPassword = authUser?.user_metadata?.has_password === true
          
          // Debug logging
          console.log('Account page - provider:', provider, 'hasPassword:', hasPassword, 'authUser:', authUser)
          
          const showBackupPasswordBanner = provider === 'google' && !hasPassword
          
          return showBackupPasswordBanner && user && (
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
          )
        })()}

        {/* User Profile Card - Compact */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {/* Avatar - Circular */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            
            {/* User Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                textTransform: 'capitalize',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user?.name || 'User'}
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user?.email || 'No email'}
              </p>
            </div>
          </div>
          
          {/* View Profile Button */}
          <button
            onClick={() => setShowProfileDetails(true)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            View Profile
          </button>
        </div>

        {/* Engagement Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px' }}>🎉</div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                Want free entry? Join our VT Ambassador Program
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px'
              }}>
                Get free drinks and VIP line skip with PartyTix.
              </div>
            </div>
          </div>
        </div>

        {/* Primary Shortcuts - Grid Cards */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {/* My Tickets */}
            <button
              onClick={() => setShowTicketsModal(true)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
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
                🎟
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
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
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
                📜
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
                alert('Settings feature coming soon!')
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
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

            {/* Payment Methods */}
            <button
              onClick={() => {
                alert('Payment Methods feature coming soon!')
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                💳
              </div>
              <span style={{ 
                color: 'white', 
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Payment Methods
              </span>
            </button>
          </div>
        </div>

        {/* Growth / Value Section - Secondary Shortcuts */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            {/* Rewards */}
            <button
              onClick={() => {
                alert('Rewards feature coming soon!')
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ⭐
              </div>
              <span style={{ 
                color: 'white', 
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Rewards
              </span>
            </button>

            {/* Invite Friends */}
            <button
              onClick={() => {
                alert('Invite Friends feature coming soon!')
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👥
              </div>
              <span style={{ 
                color: 'white', 
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Invite Friends
              </span>
            </button>

            {/* Wallet / PartyTix Credit */}
            <button
              onClick={() => {
                alert('Wallet feature coming soon!')
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(34, 211, 238, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                💵
              </div>
              <span style={{ 
                color: 'white', 
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Wallet
              </span>
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Support
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => {
                router.push('/contact')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 0',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.paddingLeft = '8px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                e.currentTarget.style.paddingLeft = '0'
              }}
            >
              Contact Us
            </button>
            <button
              onClick={() => {
                alert('Terms of Service - Coming soon!')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 0',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.paddingLeft = '8px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                e.currentTarget.style.paddingLeft = '0'
              }}
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                alert('Privacy Policy - Coming soon!')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 0',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.paddingLeft = '8px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                e.currentTarget.style.paddingLeft = '0'
              }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                alert('Help / FAQ - Coming soon!')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 0',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.paddingLeft = '8px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
                e.currentTarget.style.paddingLeft = '0'
              }}
            >
              Help / FAQ
            </button>
          </div>
        </div>

        {/* Logout Button - Bottom */}
        <div style={{ marginTop: '32px', marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
              e.currentTarget.style.color = '#fca5a5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            }}
          >
            Logout
          </button>
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
                onClick={() => {
                  setShowTicketsModal(false)
                  setActiveTab('entry')
                  setShowActiveSection(false)
                  setShowUsedSection(false)
                  setRedemptionState({})
                  setShowQRCodes({})
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

            {/* Tabs */}
            {(() => {
              // Group tickets by category for tab counts
              const entryTickets = tickets.filter(t => {
                const category = getTicketKindCategoryName(t.ticket_kind)
                return category === 'Entry Tickets'
              })
              const drinkTickets = tickets.filter(t => {
                const category = getTicketKindCategoryName(t.ticket_kind)
                return category === 'Drink Tickets'
              })
              const otherTickets = tickets.filter(t => {
                const category = getTicketKindCategoryName(t.ticket_kind)
                return category === 'Other'
              })

              return (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '24px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    onClick={() => setActiveTab('entry')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: activeTab === 'entry' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '16px',
                      fontWeight: activeTab === 'entry' ? '600' : '500',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: activeTab === 'entry' ? '2px solid #7C3AED' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Entry Tickets ({entryTickets.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('drink')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: activeTab === 'drink' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '16px',
                      fontWeight: activeTab === 'drink' ? '600' : '500',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: activeTab === 'drink' ? '2px solid #7C3AED' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Drink Tickets ({drinkTickets.length})
                  </button>
                  {otherTickets.length > 0 && (
                    <button
                      onClick={() => setActiveTab('other')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: activeTab === 'other' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                        fontSize: '16px',
                        fontWeight: activeTab === 'other' ? '600' : '500',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'other' ? '2px solid #7C3AED' : '2px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Other ({otherTickets.length})
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Tickets Content */}
            {(() => {
              // Filter tickets by active tab
              const filteredTickets = tickets.filter(ticket => {
                const category = getTicketKindCategoryName(ticket.ticket_kind)
                if (activeTab === 'entry') {
                  return category === 'Entry Tickets'
                } else if (activeTab === 'drink') {
                  return category === 'Drink Tickets'
                } else if (activeTab === 'other') {
                  return category === 'Other'
                }
                return false
              })

              if (filteredTickets.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    padding: '40px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
                    <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                      {activeTab === 'entry' && 'No entry tickets yet'}
                      {activeTab === 'drink' && 'No drink tickets yet'}
                      {activeTab === 'other' && 'No other tickets'}
                    </div>
                    <div style={{ fontSize: '14px' }}>Purchase tickets for events to see them here</div>
                  </div>
                )
              }

              // Separate unused and used tickets
              const unusedTickets = filteredTickets.filter(t => isTicketActive(t))
              const usedTickets = filteredTickets.filter(t => !isTicketActive(t))

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Unused Tickets */}
                  {unusedTickets.length > 0 && (
                    <div>
                      <div
                        onClick={() => setShowActiveSection(!showActiveSection)}
                        style={{
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          userSelect: 'none'
                        }}
                      >
                        <span>Active ({unusedTickets.length})</span>
                        <span style={{ fontSize: '14px' }}>{showActiveSection ? '▾' : '▸'}</span>
                      </div>
                      {showActiveSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {unusedTickets.map(ticket => {
                            const redemptionStateValue = redemptionState[ticket.id]?.state || 'idle'
                            const redeemLocation = getTicketRedemptionLocation(ticket.ticket_kind)
                            const ticketLabel = getTicketKindDisplayName(ticket.ticket_kind)
                            const showQR = showQRCodes[ticket.id] || false
                          
                          return (
                            <div
                              key={ticket.id}
                              style={{
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '20px',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              {/* Ticket Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    marginBottom: '8px'
                                  }}>
                                    {ticketLabel}
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    marginBottom: '4px'
                                  }}>
                                    {ticket.event_title_snapshot || ticket.events?.title || 'Event'}
                                  </div>
                                  {(ticket.event_start_at_snapshot || ticket.events?.start_at) && (
                                    <div style={{
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '14px'
                                    }}>
                                      {new Date(ticket.event_start_at_snapshot || ticket.events.start_at).toLocaleString()}
                                    </div>
                                  )}
                                  {ticket.event_venue_snapshot && (
                                    <div style={{
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '14px'
                                    }}>
                                      📍 {ticket.event_venue_snapshot}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                  {/* Status Badge */}
                                  <span style={{
                                    background: 'rgba(34, 211, 238, 0.2)',
                                    color: '#22D3EE',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}>
                                    ACTIVE
                                  </span>
                                  {/* Redemption Location Badge */}
                                  <span style={{
                                    background: redeemLocation === 'door' 
                                      ? 'rgba(59, 130, 246, 0.2)' 
                                      : 'rgba(168, 85, 247, 0.2)',
                                    color: redeemLocation === 'door' ? '#3b82f6' : '#a855f7',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}>
                                    Use at {redeemLocation === 'door' ? 'Door' : 'Bar'}
                                  </span>
                                </div>
                              </div>

                              {/* Redemption Warning/Confirmation */}
                              {redemptionStateValue === 'warning' && (
                                <div style={{
                                  background: 'rgba(251, 191, 36, 0.15)',
                                  border: '1px solid rgba(251, 191, 36, 0.4)',
                                  borderRadius: '12px',
                                  padding: '12px',
                                  marginBottom: '16px'
                                }}>
                                  <div style={{
                                    color: '#fbbf24',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    marginBottom: '4px'
                                  }}>
                                    ⚠️ For staff only
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '13px'
                                  }}>
                                    Do not tap unless you are bar or door staff.
                                  </div>
                                </div>
                              )}

                              {redemptionStateValue === 'confirm' && (
                                <div style={{
                                  background: 'rgba(124, 58, 237, 0.15)',
                                  border: '1px solid rgba(124, 58, 237, 0.4)',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  marginBottom: '16px'
                                }}>
                                  <div style={{
                                    color: '#7C3AED',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    marginBottom: '12px'
                                  }}>
                                    You are about to redeem this ticket
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '14px',
                                    marginBottom: '8px'
                                  }}>
                                    <strong>Event:</strong> {ticket.event_title_snapshot || 'Event'}
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '14px',
                                    marginBottom: '8px'
                                  }}>
                                    <strong>Type:</strong> {ticketLabel}
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '14px',
                                    marginBottom: '16px'
                                  }}>
                                    <strong>Location:</strong> {redeemLocation === 'door' ? 'Door' : 'Bar'}
                                  </div>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      const timer = setTimeout(() => {
                                        handleRedemptionLongPress(ticket.id)
                                      }, 1500)
                                      setRedemptionState(prev => ({
                                        ...prev,
                                        [ticket.id]: { ...prev[ticket.id], longPressTimer: timer }
                                      }))
                                    }}
                                    onMouseUp={() => {
                                      const state = redemptionState[ticket.id]
                                      if (state?.longPressTimer) {
                                        clearTimeout(state.longPressTimer)
                                        setRedemptionState(prev => ({
                                          ...prev,
                                          [ticket.id]: { ...prev[ticket.id], longPressTimer: null }
                                        }))
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      const state = redemptionState[ticket.id]
                                      if (state?.longPressTimer) {
                                        clearTimeout(state.longPressTimer)
                                        setRedemptionState(prev => ({
                                          ...prev,
                                          [ticket.id]: { ...prev[ticket.id], longPressTimer: null }
                                        }))
                                      }
                                    }}
                                    onTouchStart={(e) => {
                                      e.preventDefault()
                                      const timer = setTimeout(() => {
                                        handleRedemptionLongPress(ticket.id)
                                      }, 1500)
                                      setRedemptionState(prev => ({
                                        ...prev,
                                        [ticket.id]: { ...prev[ticket.id], longPressTimer: timer }
                                      }))
                                    }}
                                    onTouchEnd={() => {
                                      const state = redemptionState[ticket.id]
                                      if (state?.longPressTimer) {
                                        clearTimeout(state.longPressTimer)
                                        setRedemptionState(prev => ({
                                          ...prev,
                                          [ticket.id]: { ...prev[ticket.id], longPressTimer: null }
                                        }))
                                      }
                                    }}
                                    disabled={redemptionStateValue === 'redeeming'}
                                    style={{
                                      width: '100%',
                                      background: redemptionStateValue === 'redeeming' 
                                        ? 'rgba(124, 58, 237, 0.5)' 
                                        : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '12px',
                                      padding: '14px',
                                      fontSize: '15px',
                                      fontWeight: '600',
                                      cursor: redemptionStateValue === 'redeeming' ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.3s ease',
                                      opacity: redemptionStateValue === 'redeeming' ? 0.7 : 1
                                    }}
                                  >
                                    {redemptionStateValue === 'redeeming' ? 'Redeeming...' : 'Press and hold to redeem'}
                                  </button>
                                  <button
                                    onClick={() => resetRedemptionState(ticket.id)}
                                    style={{
                                      width: '100%',
                                      marginTop: '8px',
                                      background: 'transparent',
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      borderRadius: '12px',
                                      padding: '10px',
                                      fontSize: '14px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {/* Redemption Button - show for idle and warning states */}
                              {(redemptionStateValue === 'idle' || redemptionStateValue === 'warning') && (
                                <button
                                  onClick={() => handleRedemptionTap(ticket.id)}
                                  disabled={redemptionStateValue === 'redeeming'}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(124, 58, 237, 0.2)',
                                    border: '1px solid rgba(124, 58, 237, 0.5)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: redemptionStateValue === 'redeeming' ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    opacity: redemptionStateValue === 'redeeming' ? 0.7 : 1
                                  }}
                                >
                                  {redemptionStateValue === 'warning' ? 'Tap again to confirm' : 'Redeem'}
                                </button>
                              )}

                              {/* QR Code - collapsible */}
                              <div style={{ marginTop: '16px' }}>
                                {!showQR ? (
                                  <button
                                    onClick={() => toggleQRCode(ticket.id)}
                                    style={{
                                      width: '100%',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: 'rgba(255, 255, 255, 0.8)',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease'
                                    }}
                                  >
                                    Show QR Code
                                  </button>
                                ) : (
                                  <div style={{
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    maxWidth: '280px',
                                    margin: '0 auto',
                                    transition: 'all 0.3s ease'
                                  }}>
                                    <div style={{
                                      background: 'white',
                                      padding: '12px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}>
                                      <QRCodeSVG 
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${ticket.short_id || ticket.id}`}
                                        size={150}
                                        level="M"
                                      />
                                      {ticket.short_id && (
                                        <div style={{ 
                                          fontSize: '12px', 
                                          color: '#666',
                                          fontFamily: 'monospace'
                                        }}>
                                          ID: {ticket.short_id}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleQRCode(ticket.id)}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                      }}
                                    >
                                      Hide QR Code
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Used Tickets */}
                  {usedTickets.length > 0 && (
                    <div>
                      <div
                        onClick={() => setShowUsedSection(!showUsedSection)}
                        style={{
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          userSelect: 'none'
                        }}
                      >
                        <span>Used ({usedTickets.length})</span>
                        <span style={{ fontSize: '14px' }}>{showUsedSection ? '▾' : '▸'}</span>
                      </div>
                      {showUsedSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {usedTickets.map(ticket => {
                            const ticketLabel = getTicketKindDisplayName(ticket.ticket_kind)
                            const redeemLocation = getTicketRedemptionLocation(ticket.ticket_kind)
                            const showQR = showQRCodes[ticket.id] || false
                          
                          return (
                            <div
                              key={ticket.id}
                              style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '20px',
                                opacity: 0.7,
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    marginBottom: '8px'
                                  }}>
                                    {ticketLabel}
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    marginBottom: '4px'
                                  }}>
                                    {ticket.event_title_snapshot || ticket.events?.title || 'Event'}
                                  </div>
                                  {ticket.used_at && (
                                    <div style={{
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      fontSize: '13px',
                                      marginTop: '8px'
                                    }}>
                                      Redeemed: {new Date(ticket.used_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <span style={{
                                  background: 'rgba(34, 197, 94, 0.2)',
                                  color: '#22c55e',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  USED
                                </span>
                              </div>
                              {/* QR Code - collapsible for used tickets */}
                              <div style={{ marginTop: '16px' }}>
                                {!showQR ? (
                                  <button
                                    onClick={() => toggleQRCode(ticket.id)}
                                    style={{
                                      width: '100%',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: 'rgba(255, 255, 255, 0.6)',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      opacity: 0.7
                                    }}
                                  >
                                    Show QR Code
                                  </button>
                                ) : (
                                  <div style={{
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    maxWidth: '280px',
                                    margin: '0 auto',
                                    transition: 'all 0.3s ease',
                                    opacity: 0.7
                                  }}>
                                    <div style={{
                                      background: 'white',
                                      padding: '12px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}>
                                      <QRCodeSVG 
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${ticket.short_id || ticket.id}`}
                                        size={150}
                                        level="M"
                                      />
                                    </div>
                                    <button
                                      onClick={() => toggleQRCode(ticket.id)}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                      }}
                                    >
                                      Hide QR Code
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )
            })()}
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