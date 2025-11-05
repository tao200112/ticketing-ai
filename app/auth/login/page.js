'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
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