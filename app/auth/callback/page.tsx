'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { handleAfterLogin } from '@/lib/auth-after-login'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState('Processing verification...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        
        // 检查 URL 中是否有 code 参数（PKCE 流程）
        const code = searchParams.get('code')
        const errorCode = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // 如果有错误参数，显示错误
        if (errorCode) {
          console.error('[Callback] Error from Supabase:', errorCode, errorDescription)
          setError(errorDescription || 'Verification failed. Please try again.')
          setStatusMessage('Verification failed')
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
          return
        }

        // 如果有 code，进行 PKCE code exchange
        if (code) {
          setStatusMessage('Exchanging verification code...')
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('[Callback] Code exchange error:', exchangeError)
            setError(exchangeError.message || 'Failed to verify email. Please try again.')
            setStatusMessage('Verification failed')
            setTimeout(() => {
              router.push('/auth/login')
            }, 3000)
            return
          }

          if (data.session) {
            setStatusMessage('Verification complete! Redirecting...')
            // 使用统一的 after-login 处理逻辑
            await handleAfterLogin({
              path: typeof window !== 'undefined' ? window.location.pathname : '',
              router,
            })
            return
          }
        }

        // 如果没有 code，检查是否已有会话
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatusMessage('Verification complete! Redirecting...')
          await handleAfterLogin({
            path: typeof window !== 'undefined' ? window.location.pathname : '',
            router,
          })
          return
        }

        // 如果既没有 code 也没有 session，等待一下再检查
        setStatusMessage('Waiting for session...')
        const checkInterval = setInterval(async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            clearInterval(checkInterval)
            setStatusMessage('Verification complete! Redirecting...')
            await handleAfterLogin({
              path: typeof window !== 'undefined' ? window.location.pathname : '',
              router,
            })
          }
        }, 500)

        // 15 秒后超时
        const timeout = setTimeout(() => {
          clearInterval(checkInterval)
          if (!error) {
            setError('Verification timeout. Please try again.')
            setStatusMessage('Verification timeout')
            setTimeout(() => {
              router.push('/auth/login')
            }, 2000)
          }
        }, 15000)

        return () => {
          clearInterval(checkInterval)
          clearTimeout(timeout)
        }
      } catch (err) {
        console.error('[Callback] Unexpected error:', err)
        setError('An unexpected error occurred. Please try again.')
        setStatusMessage('Error')
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    }

    handleCallback()
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
        width: '100%',
        maxWidth: '448px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px'
        }}>
          Email Verification
        </h1>
        <p style={{
          color: error ? '#ef4444' : '#94a3b8',
          fontSize: '1rem',
          marginBottom: '24px'
        }}>
          {statusMessage}
        </p>
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginTop: '16px'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: 'white' }}>Loading...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}

