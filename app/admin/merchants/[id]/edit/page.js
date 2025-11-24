'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminMerchantEditPage() {
  const router = useRouter()
  const params = useParams()
  const merchantId = params?.id

  const [adminUser, setAdminUser] = useState(null)
  const [merchant, setMerchant] = useState(null)
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [formState, setFormState] = useState({
    max_events: '',
    region_id: '',
  })

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
      loadMerchant()
    } catch (parseError) {
      console.error('Failed to parse admin user', parseError)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      router.push('/admin')
    }
  }, [router, merchantId])

  const loadMerchant = async () => {
    if (!merchantId) return

    try {
      setLoading(true)
      const response = await fetch('/api/admin/merchants')
      if (!response.ok) {
        throw new Error('Failed to load merchants')
      }
      const data = await response.json()
      const found = (Array.isArray(data) ? data : []).find((item) => item.id === merchantId)
      if (!found) {
        setError('Merchant not found')
        setMerchant(null)
        return
      }
      setMerchant(found)
      setFormState({
        max_events: found.max_events ?? '',
        region_id: found.region_id || found.region?.id || '',
      })
      setError('')
    } catch (err) {
      console.error('Failed to load merchant', err)
      setMerchant(null)
      setError('无法加载商家信息，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  const loadRegions = async () => {
    try {
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
    }
  }

  const handleInputChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!merchantId) return
    if (!formState.region_id) {
      setError('Please select a region for this merchant.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_events: formState.max_events === '' ? null : Number(formState.max_events),
          region_id: formState.region_id,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to save merchant')
      }

      setToast({ type: 'success', message: 'Merchant updated successfully' })
      await loadMerchant()
    } catch (err) {
      console.error('Failed to save merchant', err)
      setToast({ type: 'error', message: err.message || '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (!adminUser) {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #030712 0%, #6d28d9 45%, #0f172a 100%)',
        paddingTop: '80px',
        color: 'white',
      }}
    >
      <AdminNavbar />

      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '24px',
        }}
      >
        <button
          onClick={() => router.push('/admin/merchants')}
          style={{
            marginBottom: '16px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Back to merchants
        </button>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
          }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Edit Merchant
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '24px' }}>
            Update merchant quotas and assigned region.
          </p>

          {toast && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${
                  toast.type === 'success' ? 'rgba(34,197,94,0.5)' : 'rgba(248,113,113,0.5)'
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
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(248,113,113,0.5)',
                background: 'rgba(248,113,113,0.15)',
                color: '#fecaca',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Loading merchant...</div>
          ) : !merchant ? (
            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Merchant not found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px' }}
                >
                  Merchant
                </label>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.25)',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{merchant.name || 'Unnamed Merchant'}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {merchant.email}
                  </div>
                </div>
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px' }}
                  htmlFor="region_id"
                >
                  Region *
                </label>
                <select
                  id="region_id"
                  value={formState.region_id}
                  onChange={(e) => handleInputChange('region_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.35)',
                    color: 'white',
                  }}
                >
                  <option value="" disabled>
                    Select region
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id} style={{ color: '#0f172a' }}>
                      {region.name}
                      {!region.is_active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: '0.9rem', marginBottom: '6px' }}
                  htmlFor="max_events"
                >
                  Max Events
                </label>
                <input
                  id="max_events"
                  type="number"
                  min="0"
                  value={formState.max_events}
                  onChange={(e) => handleInputChange('max_events', e.target.value)}
                  placeholder="e.g., 10"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.35)',
                    color: 'white',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => router.push('/admin/merchants')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                    color: 'white',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

