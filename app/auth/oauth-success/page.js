'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OAuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sessionParam = searchParams.get('session')
    
    if (!sessionParam) {
      console.error('❌ No session data in OAuth success page')
      router.replace('/auth/login?error=missing_session')
      return
    }

    try {
      const sessionData = JSON.parse(sessionParam)
      
      // Save session to localStorage based on role
      if (sessionData.role === 'merchant') {
        // For merchant users, save to merchantUser (same format as merchant login)
        const merchantUser = {
          id: sessionData.id,
          email: sessionData.email,
          name: sessionData.name,
          role: sessionData.role
        }
        localStorage.setItem('merchantUser', JSON.stringify(merchantUser))
        localStorage.setItem('merchantToken', 'merchant-logged-in')
        console.log('✅ Google OAuth merchant session saved to localStorage', merchantUser)
        
        // Redirect to merchant dashboard
        router.replace('/merchant')
      } else {
        // For regular users and admins, save to userSession
        localStorage.setItem('userSession', JSON.stringify(sessionData))
        console.log('✅ Google OAuth session saved to localStorage', sessionData)
        
        // Redirect based on role
        if (sessionData.role === 'admin') {
          router.replace('/admin')
        } else {
          router.replace('/account')
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse session data:', error)
      router.replace('/auth/login?error=invalid_session')
    }
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
          Signing you in...
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

