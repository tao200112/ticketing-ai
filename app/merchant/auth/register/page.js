'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MerchantRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    businessName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

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

    if (!formData.email) {
      newErrors.email = 'Please enter email address'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.name) {
      newErrors.name = 'Please enter your name'
    }

    if (!formData.businessName) {
      newErrors.businessName = 'Please enter business name'
    }

    if (!formData.phone) {
      newErrors.phone = 'Please enter contact phone'
    }

    if (!formData.password) {
      newErrors.password = 'Please enter password'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      const response = await fetch('/api/merchant/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          businessName: formData.businessName,
          phone: formData.phone,
          password: formData.password,
          inviteCode: formData.inviteCode
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Registration successful, save user info to localStorage
        localStorage.setItem('merchantUser', JSON.stringify(data.merchant))
        localStorage.setItem('merchantToken', 'merchant_token_' + Date.now())
        
        // Also save to merchant users list (for admin dashboard)
        const existingMerchants = JSON.parse(localStorage.getItem('merchantUsers') || '[]')
        const updatedMerchants = [...existingMerchants, data.merchant]
        localStorage.setItem('merchantUsers', JSON.stringify(updatedMerchants))
        
        // Navigate to merchant dashboard
        router.push('/merchant')
      } else {
        setErrors({ general: data.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'Network error, please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <svg style={{ width: '2rem', height: '2rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            Merchant Registration
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Create your merchant account and start managing events
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.email ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Your Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.name ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.name ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Business Name *
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter your business name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.businessName ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.businessName ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.businessName && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.businessName}
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Contact Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your contact phone"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.phone ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.phone ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.phone && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (8+ characters)"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.password ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Enter password again"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Invite Code */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Invite Code * <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(Invite code provided by admin)</span>
            </label>
            <input
              type="text"
              name="inviteCode"
              value={formData.inviteCode}
              onChange={handleChange}
              placeholder="Enter invite code"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: errors.inviteCode ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.inviteCode ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.inviteCode && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.inviteCode}
              </p>
            )}
          </div>

          {/* Error Message */}
          {errors.general && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#fca5a5',
              fontSize: '0.875rem'
            }}>
              {errors.general}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: isLoading 
                ? 'rgba(55, 65, 81, 0.5)' 
                : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid #94a3b8',
                  borderTop: '2px solid #7c3aed',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Registering...
              </>
            ) : (
              'Register Merchant Account'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Already have a merchant account?
          </p>
          <Link 
            href="/merchant/auth/login"
            style={{
              color: '#22D3EE',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#06b6d4'}
            onMouseLeave={(e) => e.target.style.color = '#22D3EE'}
          >
            Login Now
          </Link>
        </div>

        {/* Back to Home */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link 
            href="/"
            style={{
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.75rem',
              transition: 'color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#9ca3af'}
            onMouseLeave={(e) => e.target.style.color = '#6b7280'}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
