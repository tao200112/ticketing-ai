'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function OAuthSuccessContent() {
  const router = useRouter()
  const [statusMessage, setStatusMessage] = useState('Signing you in...')
  const [errorMessage, setErrorMessage] = useState(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const processSession = async () => {
      const { data: sessionInfo, error: sessionError } = await supabase.auth.getSession()
      console.log('[OAuth] getSession result', {
        session: sessionInfo?.session,
        error: sessionError
      })

      if (sessionError) {
        setErrorMessage('Failed to read Supabase session. Please try again.')
        return
      }

      const sessionUser = sessionInfo?.session?.user
      if (!sessionUser?.email) {
        console.error('[OAuth] missing session or email', { sessionUser })
        setErrorMessage('Missing OAuth session. Please return to login and try again.')
        return
      }

      const payload = {
        email: sessionUser.email,
        provider: sessionUser.app_metadata?.provider || 'google',
        userId: sessionUser.id,
        role: sessionUser.user_metadata?.role || 'user',
        name:
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.user_metadata?.display_name ||
          sessionUser.email
      }

      console.log('[OAuth] calling login-from-supabase', payload)

      try {
        const response = await fetch('/api/auth/login-from-supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const result = await response.json().catch(() => null)
        console.log('[OAuth] login-from-supabase result', {
          status: response.status,
          data: result
        })

        if (!response.ok || !result?.success) {
          console.error('[OAuth] bridge failed', result)
          setErrorMessage('Google 登录失败，请返回重试。')
          return
        }

        const { auth_token: authToken, userSession } = result
        if (!authToken || !userSession) {
          console.error('[OAuth] bridge response missing auth_token or userSession', result)
          setErrorMessage('Login bridge response invalid. Please try again.')
          return
        }

        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('userSession', JSON.stringify(userSession))

        if (userSession.role === 'merchant') {
          localStorage.setItem('merchantUser', JSON.stringify(userSession))
          localStorage.setItem('merchantToken', 'merchant-logged-in')
        }

        setStatusMessage('Login successful, redirecting...')

        const destination =
          userSession.role === 'merchant'
            ? '/merchant'
            : userSession.role === 'admin'
            ? '/account/merchant/admin'
            : '/account'

        router.replace(destination)
      } catch (bridgeError) {
        console.error('[OAuth] bridge request exception', bridgeError)
        setErrorMessage('Unexpected bridge error. Please try again.')
        return
      }
    }

    processSession()
  }, [router, supabase])

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
          {errorMessage || statusMessage}
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

