'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

    // 客户端验证
    if (!formData.email || !formData.password || !formData.name) {
      setError('请填写所有必需字段（邮箱、密码、姓名）')
      setLoading(false)
      return
    }

    // 验证密码匹配
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    // 验证年龄
    const age = parseInt(formData.age)
    if (formData.age && (isNaN(age) || age < 16)) {
      setError('年龄必须年满16岁')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          age: age || null,
          password: formData.password
        }),
      })

      const result = await response.json()

      // 处理响应
      if (response.ok && result.success) {
        // 保存用户会话
        if (result.data) {
          localStorage.setItem('userSession', JSON.stringify(result.data))
          onSuccess && onSuccess(result.data)
          router.push('/account')
        }
      } else {
        // 显示具体的错误信息
        // 优先使用后端返回的错误消息
        const errorMessage = result.message || result.error || '注册失败，请稍后重试'
        setError(errorMessage)
        
        // 在控制台记录详细错误（开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.error('Registration error:', {
            status: response.status,
            error: result.error,
            message: result.message,
            details: result.details
          })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('网络错误，请检查您的网络连接后重试')
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
        注册账号
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
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            姓名 *
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
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            邮箱 *
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
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            年龄
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
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            密码 * (至少8个字符)
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
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            marginBottom: '0.5rem',
            fontSize: '0.875rem'
          }}>
            确认密码 *
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
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <div style={{
        marginTop: '1rem',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.875rem'
      }}>
        已有账号？{' '}
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
          立即登录
        </button>
      </div>
    </div>
  )
}
