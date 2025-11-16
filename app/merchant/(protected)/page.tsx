'use client'

/**
 * 商家受保护的 Dashboard 页面（/merchant）
 * 由上层 /merchant/(protected)/layout.tsx 做服务端鉴权
 */

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MerchantNavbar from '@/components/MerchantNavbar'

type MerchantProfile = {
  id: string
  email: string
  name: string | null
}

export default function MerchantDashboardPage() {
  const router = useRouter()
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/merchant/profile', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || `Failed to load profile (${res.status})`)
        }
        setMerchant(data.merchant)
      } catch (e: any) {
        setError(e?.message || 'Failed to load merchant profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)', paddingTop: '80px' }}>
        <MerchantNavbar />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, color: 'white' }}>Loading merchant dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)', paddingTop: '80px' }}>
        <MerchantNavbar />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, color: 'white' }}>
          <div style={{ marginBottom: 12, color: '#fca5a5' }}>Failed to load merchant dashboard: {error}</div>
          <button
            onClick={() => router.refresh()}
            style={{ padding: '8px 12px', borderRadius: 8, background: '#7C3AED', color: 'white', border: 'none' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)', paddingTop: '80px' }}>
      <MerchantNavbar userRole="boss" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
            Welcome, {merchant?.name || merchant?.email}
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '48px', fontSize: '1.125rem' }}>
            Please select access mode
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div
              onClick={() => router.push('/merchant/scan')}
              style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(221, 65, 101, 0.1) 100%)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '16px', padding: '32px', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(236, 72, 153, 0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 24px' }}>📱</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>Staff</h2>
              <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Scan and verify tickets</p>
              <div style={{ color: '#ec4899', fontWeight: 500 }}>Direct Access →</div>
            </div>
            <div
              onClick={() => router.push('/merchant/boss')}
              style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '16px', padding: '32px', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(124, 58, 237, 0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 24px' }}>👔</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>Boss</h2>
              <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Full Management<br /> (Password Required)</p>
              <div style={{ color: '#7c3aed', fontWeight: 500 }}>Verify Password →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


