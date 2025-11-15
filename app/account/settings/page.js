'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '@/components/NavbarPartyTix'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const SUPPORT_EMAIL = 'support@partytix.app'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    full_name: '',
    birth_year: '',
    accept_marketing: false
  })

  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !currentUser) {
          router.push('/auth/login?redirect=' + encodeURIComponent('/account/settings'))
          return
        }

        setUser(currentUser)
        setFormData(prev => ({ ...prev, email: currentUser.email || '' }))

        // Load profile
        const profileResponse = await fetch('/api/profile')
        const profileResult = await profileResponse.json()

        if (profileResult.success && profileResult.profile) {
          const profile = profileResult.profile
          setFormData(prev => ({
            ...prev,
            display_name: profile.display_name || '',
            full_name: profile.full_name || '',
            birth_year: profile.birth_year ? String(profile.birth_year) : '',
            accept_marketing: profile.accept_marketing || false
          }))
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        setMessage({ type: 'error', text: 'Failed to load profile data' })
      } finally {
        setLoading(false)
      }
    }

    loadUserAndProfile()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: formData.display_name || null,
          full_name: formData.full_name || null,
          birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
          accept_marketing: formData.accept_marketing
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = () => {
    router.push('/auth/reset-password')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '80px'
      }}>
        <NavbarPartyTix />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 80px)',
          color: 'white'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      <NavbarPartyTix />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 24px'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>
            Settings
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem'
          }}>
            Manage your account settings and preferences
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            backgroundColor: message.type === 'success' 
              ? 'rgba(16, 185, 129, 0.2)' 
              : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: 'white'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile Section */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'white',
              marginBottom: '24px'
            }}>
              Profile
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    cursor: 'not-allowed'
                  }}
                />
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px',
                  marginTop: '4px'
                }}>
                  Email cannot be changed
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Enter your display name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Full Name */}
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Full Name <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Birth Year */}
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Birth Year <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>(optional)</span>
                </label>
                <input
                  type="number"
                  value={formData.birth_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value }))}
                  placeholder="YYYY"
                  min="1900"
                  max={new Date().getFullYear()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'white',
              marginBottom: '24px'
            }}>
              Preferences
            </h2>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  Receive event & promotion emails
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px'
                }}>
                  Get updates about new events and special offers
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '48px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.accept_marketing}
                  onChange={(e) => setFormData(prev => ({ ...prev, accept_marketing: e.target.checked }))}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: formData.accept_marketing ? '#7c3aed' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: formData.accept_marketing ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Account & Security Section */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'white',
              marginBottom: '24px'
            }}>
              Account & Security
            </h2>

            <button
              type="button"
              onClick={handleChangePassword}
              style={{
                padding: '12px 24px',
                background: 'rgba(124, 58, 237, 0.2)',
                border: '1px solid rgba(124, 58, 237, 0.5)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(124, 58, 237, 0.3)'
                e.target.style.borderColor = 'rgba(124, 58, 237, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(124, 58, 237, 0.2)'
                e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)'
              }}
            >
              Change / Reset Password
            </button>
          </div>

          {/* Submit Button */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={() => router.push('/account')}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = 'rgba(255, 255, 255, 0.8)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: saving ? 'rgba(124, 58, 237, 0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'wait' : 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

