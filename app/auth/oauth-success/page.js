'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function OAuthSuccessContent() {
  const router = useRouter()
  const { loading, user, session } = useAuth()
  const [statusMessage, setStatusMessage] = useState('Processing login...')

  useEffect(() => {
    console.log('[OAuth] oauth-success page mounted')
    
    if (!loading && user) {
      const role = user.user_metadata?.role
      const destination =
        role === 'merchant'
          ? '/merchant'
          : role === 'admin'
          ? '/account/merchant/admin'
          : '/account'

      setStatusMessage('Login successful, redirecting...')
      router.replace(destination)
      return
    }

    // 如果还在加载，等待一下
    if (loading) {
      setStatusMessage('Loading...')
      return
    }

    // 如果没有用户，等待一段时间让 Supabase 处理 OAuth 回调
    if (!user && !loading) {
      const checkInterval = setInterval(async () => {
        try {
          const { getSupabaseClient } = await import('@/lib/supabase-client')
          const supabase = getSupabaseClient()
          
          const { data: { session: currentSession }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('[OAuth] Session error:', error)
            clearInterval(checkInterval)
            setStatusMessage('Login failed. Please try again.')
            setTimeout(() => {
              router.push('/auth/login')
            }, 2000)
            return
          }

          if (currentSession?.user) {
            clearInterval(checkInterval)
            const role = currentSession.user.user_metadata?.role
            const destination =
              role === 'merchant'
                ? '/merchant'
                : role === 'admin'
                ? '/account/merchant/admin'
                : '/account'

            setStatusMessage('Login successful, redirecting...')
            router.replace(destination)
          }
        } catch (error) {
          console.error('[OAuth] Error checking session:', error)
        }
      }, 500)

      // 设置超时，如果 15 秒后还没有 session，重定向到登录页面
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        if (!user) {
          setStatusMessage('Login timeout. Please try again.')
          setTimeout(() => {
            router.push('/auth/login')
          }, 2000)
        }
      }, 15000)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [loading, user, session, router])

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
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ fontSize: '1rem', margin: 0 }}>
          {statusMessage}
        </p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
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
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ fontSize: '1rem', margin: 0 }}>
            Loading...
          </p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  )
}