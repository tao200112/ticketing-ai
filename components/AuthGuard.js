'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({ children, redirectTo = '/auth/login' }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        if (user.isLoggedIn) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('检查认证状态失败:', error)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '4px solid #f3f4f6',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (!isAuthenticated) {
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
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg style={{ width: '2rem', height: '2rem', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1rem'
          }}>
            需要登录才能购买票券
          </h1>
          
          <p style={{
            color: '#94a3b8',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            请先注册或登录您的账户，然后才能购买活动票券。
          </p>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a
              href="/auth/register"
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
            >
              注册账户
            </a>
            
            <a
              href="/auth/login"
              style={{
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                color: '#d1d5db',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-block',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
            >
              登录账户
            </a>
          </div>
          
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#60a5fa',
              margin: '0',
              lineHeight: '1.5'
            }}>
              💡 注册账户后，您可以：
              <br />• 购买活动票券
              <br />• 查看购买历史
              <br />• 管理个人信息
            </p>
          </div>
        </div>
      </div>
    )
  }

  return children
}
