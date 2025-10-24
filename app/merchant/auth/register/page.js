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
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    // 不再强制检查登录状态
    setIsCheckingAuth(false)
  }, [])

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

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      })

      if (error) {
        setErrors({ general: 'Invalid email or password' })
      } else {
        setUser(data.user)
        setShowLoginForm(false)
        setLoginData({ email: '', password: '' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Login failed, please try again' })
    } finally {
      setIsLoading(false)
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
      // 如果用户已登录，直接创建商家账户
      if (user) {
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
          router.push('/merchant')
        } else {
          if (data.reason === 'invalid_invite') {
            setErrors({ inviteCode: 'Invalid or expired invite code' })
          } else if (data.reason === 'merchant_exists') {
            setErrors({ general: 'You already have a merchant account' })
          } else {
            setErrors({ general: data.reason || 'Failed to create merchant account' })
          }
        }
      } else {
        // 如果用户未登录，先注册用户，然后创建商家账户
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        // 生成随机邮箱和密码
        const tempEmail = `merchant_${Date.now()}@temp.com`
        const tempPassword = Math.random().toString(36).slice(-8)

        // 注册临时用户
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: tempEmail,
          password: tempPassword
        })

        if (authError) {
          setErrors({ general: 'Failed to create account: ' + authError.message })
          return
        }

        if (authData.user) {
          // 创建商家账户
          const response = await fetch('/api/merchant/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              userId: authData.user.id
            }),
          })

          const data = await response.json()

          if (data.ok) {
            // 显示成功信息，包含临时登录凭据
            setErrors({ 
              success: `Merchant account created successfully! 
              Temporary login: ${tempEmail} / ${tempPassword}
              Please save these credentials and login to access your merchant dashboard.` 
            })
          } else {
            setErrors({ general: data.reason || 'Failed to create merchant account' })
          }
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
          <div style={{ fontSize: '18px' }}>Loading...</div>
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
            {user ? 'Upgrade to Merchant' : 'Register as Merchant'}
          </h1>
          {user ? (
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '16px',
              marginBottom: '10px'
            }}>
              Welcome, {user.email}
            </p>
          ) : (
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '16px',
              marginBottom: '10px'
            }}>
              Create your merchant account
            </p>
          )}
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

        {errors.success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#86efac',
            fontSize: '14px',
            whiteSpace: 'pre-line'
          }}>
            {errors.success}
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
          {!user && (
            <button
              type="button"
              onClick={() => setShowLoginForm(!showLoginForm)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              {showLoginForm ? 'Hide Login' : 'Already have an account? Login'}
            </button>
          )}
          <br />
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

        {showLoginForm && !user && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '16px' }}>Login to Existing Account</h3>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="Email"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: isLoading ? 'rgba(255, 255, 255, 0.3)' : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}