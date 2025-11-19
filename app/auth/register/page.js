'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'

export default function RegisterPage() {
  const router = useRouter()
  const { registerWithPassword } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    age: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
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
      newErrors.name = 'Please enter name'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }
    
    if (!formData.age) {
      newErrors.age = 'Please enter age'
    } else if (isNaN(formData.age) || parseInt(formData.age, 10) < 16) {
      newErrors.age = 'Age must be 16 or older'
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
      const metadata = {
        full_name: formData.name,
        name: formData.name,
        age: parseInt(formData.age, 10)
      }

      const siteOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || ''

      const emailRedirectTo = siteOrigin
        ? `${siteOrigin.replace(/\/$/, '')}/auth/callback`
        : undefined

      const data = await registerWithPassword(formData.email, formData.password, {
        data: metadata,
        emailRedirectTo,
      })

      // 如果注册成功且有 session，调用 handleAfterLogin 并重定向
      if (data.session) {
        setMessage('Registration successful! Redirecting...')
        const { handleAfterLogin } = await import('@/lib/auth-after-login')
        await handleAfterLogin({
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          router,
        })
        return
      }

      // 如果没有 session（需要邮箱验证），显示成功消息但不重定向
      setMessage('Registration successful! Please check your email to confirm your account.')
    } catch (error) {
      console.error('Registration error:', error)
      setMessage(error?.message || 'Registration failed, please try again')
    } finally {
      setLoading(false)
    }
  }

  const isSuccessMessage = message && message.toLowerCase().includes('success')

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
          }}>Join PartyTix</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Create your account to get started
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
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
              placeholder="Enter your full name"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              min="16"
              max="120"
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
              placeholder="Enter your age (16+ years old)"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.age && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.age}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
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
              placeholder="Enter your password (8+ characters)"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.password}
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
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
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
              placeholder="Confirm your password"
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.confirmPassword}
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
            {loading ? 'Creating...' : 'Create PartyTix Account'}
          </button>

          {message && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: isSuccessMessage ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isSuccessMessage ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              color: isSuccessMessage ? '#22c55e' : '#ef4444',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}