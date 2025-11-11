'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function AuthGuard({ children, redirectTo = '/auth/login' }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.replace(redirectTo)
    }
  }, [loading, user, redirectTo, router])

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
        }}
      >
        <div
          style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
    )
  }

  return children
}