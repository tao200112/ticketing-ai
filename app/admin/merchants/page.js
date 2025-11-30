'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'
import MerchantRow from './_components/MerchantRow'

const cardStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
}

export default function AdminMerchantsPage() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null

    if (!token || !storedUser) {
      router.push('/admin')
      return
    }

    try {
      setAdminUser(JSON.parse(storedUser))
      loadRegions()
      loadMerchants()
    } catch (parseError) {
      console.error('Failed to parse admin user data', parseError)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      router.push('/admin')
    }
  }, [router])

  const loadRegions = async () => {
    try {
      setRegionsLoading(true)
      const response = await fetch('/api/regions?include_inactive=true')
      if (response.ok) {
        const result = await response.json()
        setRegions(result?.data || [])
      } else {
        setRegions([])
      }
    } catch (err) {
      console.error('Failed to load regions', err)
      setRegions([])
    } finally {
      setRegionsLoading(false)
    }
  }

  const loadMerchants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/merchants')
      if (!response.ok) {
        throw new Error('Failed to fetch merchants')
      }
      const data = await response.json()
      setMerchants(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      console.error('Failed to load merchants', err)
      setMerchants([])
      setError('无法加载商家列表，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  const filteredMerchants = useMemo(() => {
    if (!search.trim()) {
      return merchants
    }
    const keyword = search.trim().toLowerCase()
    return merchants.filter((merchant) => {
      return (
        merchant.name?.toLowerCase().includes(keyword) ||
        merchant.email?.toLowerCase().includes(keyword) ||
        merchant.contact_phone?.toLowerCase().includes(keyword)
      )
    })
  }, [search, merchants])

  if (!adminUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <div
          style={{
            ...cardStyle,
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <p style={{ marginBottom: '16px', fontSize: '18px' }}>Please log in as admin</p>
          <button
            onClick={() => router.push('/admin')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #030712 0%, #6d28d9 45%, #0f172a 100%)',
        paddingTop: '80px',
      }}
    >
      <AdminNavbar />

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '12px',
                marginBottom: '6px',
              }}
            >
              Merchant Management
            </p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0 }}>Merchants</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search merchants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'white',
                minWidth: '240px',
              }}
            />
          </div>
        </div>

        {toast && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '14px',
              border: `1px solid ${
                toast.type === 'success' ? 'rgba(34,197,94,0.6)' : 'rgba(248,113,113,0.6)'
              }`,
              background:
                toast.type === 'success'
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(248,113,113,0.15)',
              color: toast.type === 'success' ? '#bbf7d0' : '#fecaca',
            }}
          >
            {toast.message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(248,113,113,0.6)',
              background: 'rgba(248,113,113,0.15)',
              color: '#fecaca',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Showing {filteredMerchants.length} of {merchants.length} merchants
              </span>
              <button
                onClick={loadMerchants}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  {['Merchant', 'Contact', 'Region', 'Status', 'Actions'].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left',
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                      Loading merchants...
                    </td>
                  </tr>
                ) : filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <MerchantRow
                      key={merchant.id}
                      merchant={merchant}
                      regions={regions}
                      regionsLoading={regionsLoading}
                      onSuccess={async (message) => {
                        setToast({ type: 'success', message })
                        await loadMerchants()
                      }}
                      onError={(message) => setToast({ type: 'error', message })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

