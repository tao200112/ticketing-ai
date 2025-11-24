'use client'

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'

const emptyRegionForm = {
  name: '',
  slug: '',
  subtitle: '',
  cover_image: '',
  is_active: true,
}

const slugify = (value: string) =>
  value
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || ''

export default function AdminRegionsPage() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<any[]>([])
  const [formState, setFormState] = useState(emptyRegionForm)
  const [editingRegion, setEditingRegion] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    const user = localStorage.getItem('adminUser')

    if (!token || !user) {
      router.push('/admin')
      return
    }

    try {
      setAdminUser(JSON.parse(user))
      loadRegions()
    } catch (error) {
      console.error('Failed to parse admin user data', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      router.push('/admin')
    }
  }, [router])

  const loadRegions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/regions?include_inactive=true')
      const result = await response.json()
      if (response.ok && result?.data) {
        setRegions(result.data)
      } else {
        setRegions([])
      }
    } catch (error) {
      console.error('Failed to load regions', error)
      setRegions([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateForm = () => {
    setEditingRegion(null)
    setFormState(emptyRegionForm)
    setErrorMessage('')
    setShowForm(true)
  }

  const openEditForm = (region: any) => {
    setEditingRegion(region)
    setFormState({
      name: region.name || '',
      slug: region.slug || '',
      subtitle: region.subtitle || '',
      cover_image: region.cover_image || '',
      is_active: region.is_active ?? true,
    })
    setErrorMessage('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingRegion(null)
    setFormState(emptyRegionForm)
    setErrorMessage('')
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const duplicateSlug = useMemo(() => {
    if (!formState.slug && !formState.name) {
      return false
    }
    const targetSlug = slugify(formState.slug || formState.name)
    return regions.some(
      (region) =>
        region.slug === targetSlug &&
        region.id !== editingRegion?.id
    )
  }, [formState.slug, formState.name, regions, editingRegion])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.name.trim()) {
      setErrorMessage('Name is required')
      return
    }
    if (duplicateSlug) {
      setErrorMessage('Slug already exists')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage('')
      const payload = {
        name: formState.name.trim(),
        slug: formState.slug?.trim(),
        subtitle: formState.subtitle?.trim(),
        cover_image: formState.cover_image?.trim(),
        is_active: formState.is_active,
      }

      const endpoint = editingRegion
        ? `/api/admin/regions/${editingRegion.id}`
        : '/api/admin/regions'

      const method = editingRegion ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        setErrorMessage(result?.error || 'Failed to save region')
        return
      }

      setToast({
        type: 'success',
        text: editingRegion ? 'Region updated' : 'Region created',
      })
      closeForm()
      await loadRegions()
    } catch (error) {
      console.error('Failed to save region', error)
      setErrorMessage('Failed to save region')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (region: any) => {
    try {
      const response = await fetch(`/api/admin/regions/${region.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !region.is_active }),
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        setToast({ type: 'error', text: result?.error || 'Update failed' })
        return
      }

      setToast({
        type: 'success',
        text: region.is_active ? 'Region disabled' : 'Region enabled',
      })
      await loadRegions()
    } catch (error) {
      console.error('Failed to toggle region', error)
      setToast({ type: 'error', text: 'Failed to update region' })
    }
  }

  const handleSoftDelete = async (region: any) => {
    try {
      const response = await fetch(`/api/admin/regions/${region.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        setToast({ type: 'error', text: result?.error || 'Delete failed' })
        return
      }

      setToast({ type: 'success', text: 'Region disabled' })
      await loadRegions()
    } catch (error) {
      console.error('Failed to disable region', error)
      setToast({ type: 'error', text: 'Failed to disable region' })
    }
  }

  if (!adminUser) {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px',
    }}>
      <AdminNavbar />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '32px',
              fontWeight: 700,
              marginBottom: '8px',
            }}>
              Regions
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Manage regional experiences and landing pages
            </p>
          </div>
          <button
            onClick={openCreateForm}
            style={{
              padding: '12px 20px',
              borderRadius: '999px',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              color: 'white',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              boxShadow: '0 10px 30px rgba(168, 85, 247, 0.4)',
            }}
          >
            + Add Region
          </button>
        </div>

        {toast && (
          <div style={{
            marginBottom: '16px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
          }}>
            {toast.text}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}>
          {loading && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'white',
              padding: '40px',
            }}>
              Loading regions...
            </div>
          )}

          {!loading && regions.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: 'white',
              padding: '40px',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}>
              No regions found. Click "Add Region" to create one.
            </div>
          )}

          {regions.map((region) => (
            <div
              key={region.id}
              style={{
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.85)',
                boxShadow: '0 20px 35px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: '160px',
                  background: region.cover_image
                    ? `url(${region.cover_image}) center/cover`
                    : 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(14,165,233,0.7))',
                }}
              />
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: 'white', fontSize: '20px', margin: 0 }}>
                    {region.name}
                  </h3>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: region.is_active ? '#10b981' : '#f87171',
                      background: region.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                      border: `1px solid ${region.is_active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
                    }}
                  >
                    {region.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                  {region.subtitle || 'No subtitle'}
                </p>
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                  <div>Slug: {region.slug}</div>
                  {region.created_at && (
                    <div>Created: {new Date(region.created_at).toLocaleDateString()}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  <button
                    onClick={() => openEditForm(region)}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(region)}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: region.is_active
                        ? 'rgba(248, 113, 113, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                      color: region.is_active ? '#f87171' : '#34d399',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {region.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleSoftDelete(region)}
                    style={{
                      flexBasis: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Soft delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 100,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ color: 'white', fontSize: '22px', margin: 0 }}>
                {editingRegion ? 'Edit Region' : 'Add Region'}
              </h2>
              <button
                onClick={closeForm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Name *</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Blacksburg"
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Slug *</label>
                <input
                  type="text"
                  value={formState.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. blacksburg"
                />
                <small style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Auto-generated: {slugify(formState.slug || formState.name)}
                </small>
              </div>
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Subtitle</label>
                <input
                  type="text"
                  value={formState.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  style={inputStyle}
                  placeholder="Tagline shown on region card"
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Cover Image URL</label>
                <input
                  type="text"
                  value={formState.cover_image}
                  onChange={(e) => handleInputChange('cover_image', e.target.value)}
                  style={inputStyle}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                />
                Active region
              </label>

              {errorMessage && (
                <div style={{
                  color: '#f87171',
                  fontSize: '13px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(248, 113, 113, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.4)',
                }}>
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '999px',
                    border: 'none',
                    fontWeight: 600,
                    color: 'white',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  marginTop: '6px',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
}

