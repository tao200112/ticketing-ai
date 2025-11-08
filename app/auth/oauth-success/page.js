'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

function OAuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState('Signing you in...')
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const sessionParam = searchParams.get('session')

    const processSession = async () => {
      if (!sessionParam) {
        console.error('❌ No session data in OAuth success page')
        setErrorMessage('Missing OAuth session data. Please try logging in again.')
        router.replace('/auth/login?error=missing_session')
        return
      }

      const supabase = getSupabaseClient()
      if (!supabase) {
        console.warn('oauth-success: Supabase client not available')
        setErrorMessage('Supabase client not available. Please retry login.')
        return
      }

      const { data: sessionInfo, error: sessionError } = await supabase.auth.getSession()
      console.log('oauth-success session', {
        session: sessionInfo?.session,
        error: sessionError
      })

      if (sessionError) {
        setErrorMessage('Failed to read Supabase session. Please try again.')
        router.replace('/auth/login?error=supabase_session_error')
        return
      }

      if (!sessionInfo?.session?.user) {
        setErrorMessage('No Supabase session found. Please log in again.')
        router.replace('/auth/login?error=no_supabase_session')
        return
      }

      let parsedSession
      try {
        parsedSession = JSON.parse(sessionParam)
      } catch (parseError) {
        console.warn('oauth-success: failed to parse session param', parseError)
      }

      const bridgeRole = parsedSession?.role || 'user'
      try {
        console.log('ℹ️ Attempting to bridge Supabase session to local token via API', {
          role: bridgeRole
        })

        const response = await fetch('/api/auth/login-from-supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: bridgeRole })
        })

        const result = await response.json().catch(() => null)

        if (!response.ok || !result?.success) {
          console.warn('oauth-success login-from-supabase failed', result)
          setErrorMessage('Unable to complete Google login. Please try again.')
          router.replace('/auth/login?error=oauth_bridge_failed')
          return
        }

        const { user, token } = result.data
        localStorage.setItem('auth_token', token)
        localStorage.setItem('userSession', JSON.stringify(user))
        console.log('✅ Supabase session bridged to local auth token', {
          email: user.email,
          role: user.role
        })

        if (user.role === 'merchant') {
          localStorage.setItem('merchantUser', JSON.stringify(user))
          localStorage.setItem('merchantToken', 'merchant-logged-in')
        }

        const destination =
          user.role === 'merchant'
            ? '/merchant'
            : user.role === 'admin'
            ? '/admin'
            : '/account'

        setStatusMessage('Login successful, redirecting...')
        router.replace(destination)
      } catch (bridgeError) {
        console.warn('⚠️ Unexpected error bridging Supabase session', bridgeError)
        setErrorMessage('Unexpected error bridging Supabase session. Please try again.')
        router.replace('/auth/login?error=oauth_bridge_exception')
      }
    }

    processSession()
  }, [searchParams, router])

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

