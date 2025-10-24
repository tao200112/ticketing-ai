'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export default function MerchantRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    inviteCode: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        setIsCheckingAuth(false)
        return
      }
      
      setUser(user)
      setIsCheckingAuth(false)
    } catch (error) {
      console.error('Auth check error:', error)
      setIsCheckingAuth(false)
    }
  }

  const handleChange = (e) => {
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

    if (!formData.businessName) {
      newErrors.businessName = 'Please enter business name'
    }

    if (!formData.phone) {
      newErrors.phone = 'Please enter contact phone'
    }

    if (!formData.inviteCode) {
      newErrors.inviteCode = 'Please enter invite code'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/merchant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (data.ok) {
        // Success - redirect to merchant dashboard
        router.push('/merchant')
      } else {
        // Handle different error types
        if (data.reason === 'not_authenticated') {
          setErrors({ general: 'Please login first before upgrading to merchant account' })
        } else if (data.reason === 'invalid_invite') {
          setErrors({ inviteCode: 'Invalid or expired invite code' })
        } else if (data.reason === 'merchant_exists') {
          setErrors({ general: 'You already have a merchant account' })
        } else {
          setErrors({ general: data.reason || 'Failed to create merchant account' })
        }
      }
    } catch (error) {
      console.error('Merchant creation error:', error)
      setErrors({ general: 'Network error, please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px' }}>Checking authentication...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
          maxWidth: '500px'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Login Required</h1>
          <p style={{ fontSize: '16px', marginBottom: '30px', opacity: 0.9 }}>
            You need to login first before upgrading to a merchant account.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link 
              href="/auth/login"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
            >
              Login
            </Link>
            <Link 
              href="/auth/register"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            🏢
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            Upgrade to Merchant
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '16px',
            marginBottom: '10px'
          }}>
            Welcome, {user.email}
          </p>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '14px' 
          }}>
            Complete your merchant profile to start selling tickets
          </p>
        </div>

        {errors.general && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '14px'
          }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'white', 
              marginBottom: '8px', 
              fontWeight: '500' 
            }}>
              Business Name *
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter your business name"
            />
            {errors.businessName && (
              <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>
                {errors.businessName}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'white', 
              marginBottom: '8px', 
              fontWeight: '500' 
            }}>
              Contact Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter your contact phone"
            />
            {errors.phone && (
              <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>
                {errors.phone}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              color: 'white', 
              marginBottom: '8px', 
              fontWeight: '500' 
            }}>
              Invite Code *
            </label>
            <input
              type="text"
              name="inviteCode"
              value={formData.inviteCode}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter your invite code"
            />
            {errors.inviteCode && (
              <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>
                {errors.inviteCode}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Creating Merchant Account...' : 'Upgrade to Merchant'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px'
        }}>
          <Link 
            href="/merchant/auth/login" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              textDecoration: 'none' 
            }}
          >
            Already have a merchant account? Login here
          </Link>
        </div>
      </div>
    </div>
  )
}