'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'
import { getSupabaseClient } from '@/lib/supabase-client'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setMessage(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  // If already logged in, redirect to account page
  useEffect(() => {
    if (authLoading) return // Wait for auth check to complete
    
    if (isAuthenticated && isAuthenticated()) {
      router.push('/account')
    }
  }, [isAuthenticated, authLoading, router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for corresponding field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Please enter email address'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Please enter password'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      console.log('🔍 Attempting login for:', formData.email)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log('✅ Login successful', result)
        
        // Get user data from result (support both result.data and result.user)
        const userData = result.data || result.user
        if (!userData) {
          console.error('❌ Login successful but no user data returned')
          setMessage('Login successful but user data not found. Please try again.')
          setLoading(false)
          return
        }
        
        // Save user session immediately
        try {
          localStorage.setItem('userSession', JSON.stringify(userData))
          console.log('✅ User session saved to localStorage')
        } catch (storageError) {
          console.error('❌ Failed to save session:', storageError)
          setMessage('Failed to save session. Please try again.')
          setLoading(false)
          return
        }
        
        setMessage('Login successful! Redirecting...')
        
        // Use replace instead of push to avoid back button issues
        // Remove setTimeout for immediate redirect
        router.replace('/account')
      } else {
        console.error('❌ Login failed:', result.error || result)
        setMessage(result.message || 'Login failed, please check email and password')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      setMessage('Network error, please check connection and try again')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setMessage('')
    
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setMessage('Supabase client not available. Please check configuration.')
        setGoogleLoading(false)
        return
      }

      // Get the current site URL for redirect
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUrl = `${siteUrl}/api/auth/callback`

      // Determine role from current path (default to 'user' for regular login page)
      // This allows the callback to know what role the user is trying to log in as
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const role = currentPath.includes('/merchant') ? 'merchant' : 
                   currentPath.includes('/admin') ? 'admin' : 
                   'user'
      
      // Pass role in state parameter so callback knows the intended role
      const state = JSON.stringify({ role })

      // Initiate Google OAuth sign-in
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            state: state
          }
        }
      })

      if (error) {
        console.error('❌ Google OAuth error:', error)
        setMessage('Failed to initiate Google login. Please try again.')
        setGoogleLoading(false)
      } else {
        // The redirect will happen automatically
        // User will be redirected to Google, then back to our callback
        console.log('✅ Google OAuth initiated, redirecting...')
      }
    } catch (error) {
      console.error('❌ Google login error:', error)
      setMessage('Network error during Google login. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        padding: '32px',
        width: '100%',
        maxWidth: '448px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>Welcome Back</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter your email address"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter your password"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-partytix-gradient"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1.125rem',
              opacity: loading || googleLoading ? 0.7 : 1,
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
            disabled={loading || googleLoading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            color: '#94a3b8'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            <span style={{
              padding: '0 16px',
              fontSize: '0.875rem'
            }}>OR</span>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: 'white',
              color: '#1f2937',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: loading || googleLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading && !googleLoading) {
                e.target.style.backgroundColor = '#f9fafb'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !googleLoading) {
                e.target.style.backgroundColor = 'white'
              }
            }}
          >
            {googleLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #1f2937',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {message && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: message.includes('successful') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.includes('successful') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              color: message.includes('successful') ? '#22c55e' : '#ef4444',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}


          <div style={{
            marginTop: '24px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <a 
                href="/auth/register"
                style={{ 
                  color: '#7c3aed', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Sign up here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          padding: '32px',
          width: '100%',
          maxWidth: '448px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px' }}>Loading...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}