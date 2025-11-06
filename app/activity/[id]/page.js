'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import NavbarPartyTix from '../../../components/NavbarPartyTix'

export default function ActivityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      loadActivity(params.id)
    }
  }, [params.id])

  const loadActivity = async (id) => {
    try {
      setLoading(true)
      setError('')
      
      // Try to get from admin API first (includes inactive activities)
      let response = await fetch(`/api/admin/activities`)
      if (response.ok) {
        const allActivities = await response.json()
        const foundActivity = Array.isArray(allActivities) 
          ? allActivities.find(a => a.id === id)
          : null
        
        if (foundActivity) {
          setActivity(foundActivity)
          setLoading(false)
          return
        }
      }
      
      // Fallback to public API
      response = await fetch('/api/activities')
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          const foundActivity = result.data.find(a => a.id === id)
          if (foundActivity) {
            setActivity(foundActivity)
            setLoading(false)
            return
          }
        }
      }
      
      setError('Activity not found')
    } catch (err) {
      console.error('Error loading activity:', err)
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '100px'
      }}>
        <NavbarPartyTix />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div>Loading activity...</div>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '100px'
      }}>
        <NavbarPartyTix />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '24px',
            color: '#fca5a5'
          }}>
            {error || 'Activity not found'}
          </div>
          <Link href="/activity" style={{
            display: 'inline-block',
            marginTop: '24px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            Back to Activities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '100px'
    }}>
      <NavbarPartyTix />
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        <Link href="/activity" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.8)',
          textDecoration: 'none',
          marginBottom: '24px',
          fontSize: '14px',
          transition: 'color 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.color = 'white'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}
        >
          ← Back to Activities
        </Link>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          {activity.image_url && (
            <div style={{
              width: '100%',
              height: '400px',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.1)'
            }}>
              <img
                src={activity.image_url}
                alt={activity.text || 'Activity'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}
          <div style={{ padding: '40px' }}>
            <h1 style={{
              color: 'white',
              fontSize: '32px',
              fontWeight: '700',
              marginBottom: '24px',
              lineHeight: '1.3'
            }}>
              {activity.title || 'Untitled Activity'}
            </h1>
            {activity.text && (
              <div style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {activity.text}
              </div>
            )}
            {activity.created_at && (
              <div style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}>
                Published: {new Date(activity.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

