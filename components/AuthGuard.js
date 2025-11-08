'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function AuthGuard({ children, redirectTo = '/auth/login' }) {
  const { loading, isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated()) {
      console.log('AuthGuard: unauthenticated, redirecting to', redirectTo)
      router.replace(redirectTo)
    } else {
      console.log('AuthGuard: user authenticated', {
        id: user?.id,
        email: user?.email,
        role: user?.role
      })
    }
  }, [loading, isAuthenticated, redirectTo, router, user])

  if (loading || !isAuthenticated()) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid #f3f4f6',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        ></div>
      </div>
    )
  }

  return children
}
