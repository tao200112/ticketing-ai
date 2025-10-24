'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabase } from '../../../lib/safeEnv'

export default function RegisterPage() {
  const router = useRouter()
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
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false)

  useEffect(() => {
    setIsSupabaseAvailable(hasSupabase())
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除对应字段的错误
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
      newErrors.email = '请输入邮箱地址'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (!formData.name) {
      newErrors.name = '请输入姓名'
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少需要2个字符'
    }
    
    if (!formData.age) {
      newErrors.age = '请输入年龄'
    } else if (isNaN(formData.age) || parseInt(formData.age) < 16) {
      newErrors.age = '年龄必须大于等于16岁'
    }
    
    // 密码验证 - 只需要大于8位
    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 8) {
      newErrors.password = '密码至少需要8个字符'
    }
    
    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          age: parseInt(formData.age),
          password: formData.password
        })
      })
      
      const result = await response.json()
      
        if (response.ok && result.ok) {
          setMessage(`Registration successful! ${result.source === 'supabase' ? 'Data saved to database' : 'Data saved locally'}`)
          
          // 保存用户信息到localStorage（不包含密码）
          const userData = {
            email: formData.email,
            name: formData.name,
            age: formData.age,
            registeredAt: new Date().toISOString(),
            source: result.source,
            isLoggedIn: true
          }
          localStorage.setItem('userData', JSON.stringify(userData))
          
          // 延迟跳转到账户页面
          setTimeout(() => {
            router.push('/account')
          }, 1500)
        } else {
          setMessage(result.message || 'Registration failed, please try again')
        }
    } catch (error) {
      console.error('注册错误:', error)
      setMessage('网络错误，请检查连接后重试')
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
          }}>Join PartyTix</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {isSupabaseAvailable ? 'Create your account to get started' : 'Local registration mode'}
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
              backgroundColor: message.includes('成功') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.includes('成功') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              color: message.includes('成功') ? '#22c55e' : '#ef4444',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          {!isSupabaseAvailable && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px',
              color: '#fbbf24',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}>
              ⚠️ Supabase 未配置，数据将保存在本地
            </div>
          )}
        </form>
      </div>
    </div>
  )
}