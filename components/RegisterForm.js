'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { registerWithPassword } = useAuth()

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name) {
      setError('Please fill in all required fields (email, password, name).')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return false
    }

    if (formData.age) {
      const ageNumber = parseInt(formData.age, 10)
      if (Number.isNaN(ageNumber) || ageNumber < 16) {
        setError('Age must be 16 or older.')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const metadata = {
        full_name: formData.name,
        name: formData.name,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
      }

      const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : ''
      const emailRedirectTo = origin ? `${origin}/auth/callback` : undefined

      const data = await registerWithPassword(formData.email, formData.password, {
        data: metadata,
        emailRedirectTo,
      })

      // 如果注册成功且有 session，调用 handleAfterLogin 并重定向
      if (data.session) {
        const { handleAfterLogin } = await import('@/lib/auth-after-login')
        await handleAfterLogin({
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          router,
        })
        return
      }

      // 如果没有 session（需要邮箱验证），显示成功消息但不重定向
      setError('Registration successful! Please check your email to confirm your account.')
    } catch (authError) {
      console.error('Registration error:', authError)
      // 提供更详细的错误信息
      let errorMessage = 'Registration failed, please try again.'
      
      if (authError?.message) {
        errorMessage = authError.message
      } else if (authError?.code) {
        switch (authError.code) {
          case 'user_already_registered':
            errorMessage = 'This email is already registered. Please sign in instead.'
            break
          case 'email_not confirmed':
            errorMessage = 'Please check your email to confirm your account.'
            break
          default:
            errorMessage = `Registration failed: ${authError.code}`
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      border: '1px solid rgba(255, 255, 255, 0.18)'
    }}>
      <h2 style={{
        color: '#fff',
        marginBottom: '1.5rem',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        Register Account
      </h2>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#fca5a5',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Age
          </label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            min="16"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Password * (at least 8 characters)
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Confirm Password *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: 'none',
            background: loading ? 'rgba(100, 116, 139, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          style={{
            background: 'none',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Sign in now
        </button>
      </div>
    </div>
  )
}