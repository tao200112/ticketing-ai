'use client'

// Google OAuth integration – Supabase Auth (2025-11-08)
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        // 保存用户会话 - API返回的数据可能在result.data或result.user中
        const userData = result.data || result.user || result
        if (userData) {
          localStorage.setItem('userSession', JSON.stringify(userData))
          onSuccess && onSuccess(userData)
          // 使用router.replace避免返回按钮问题
          router.replace('/account')
        } else {
          setError('Login successful but user data not found')
        }
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    
    try {
      console.log('ℹ️ Google login initiated (form)', {
        path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
      })

      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('Supabase client not available. Please check configuration.')
        setGoogleLoading(false)
        return
      }

      // Initiate Google OAuth sign-in
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })

      if (error) {
        console.error('❌ Google OAuth error:', error)
        setError('Failed to initiate Google login. Please try again.')
        if (typeof window !== 'undefined') {
          alert('Failed to initiate Google login. Please try again.')
        }
        setGoogleLoading(false)
      } else {
        // The redirect will happen automatically
        // User will be redirected to Google, then back to our callback
        console.log('✅ Google login handed off to Supabase (form)', {
          provider: 'google',
          path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
        })
      }
    } catch (error) {
      console.error('❌ Google login error:', error)
      setError('Network error during Google login. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          Sign In
        </h2>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px'
        }}>
          Welcome back! Please sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{
            display: 'block',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter your email address"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fca5a5',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
            opacity: loading || googleLoading ? 0.7 : 1,
            transition: 'all 0.3s ease',
            marginBottom: '16px'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

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
          fontSize: '14px'
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
          fontSize: '16px',
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
          transition: 'all 0.2s ease',
          marginBottom: '24px'
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
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
          Don't have an account?
        </p>
        <button
          onClick={onSwitchToRegister}
          style={{
            background: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Sign Up Now
        </button>
      </div>
    </div>
  )
}
