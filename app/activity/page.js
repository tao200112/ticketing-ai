'use client'

import { useState, useEffect } from 'react'
import NavbarPartyTix from '../../components/NavbarPartyTix'

export default function ActivityPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/activities')
      const result = await response.json()

      if (result.success) {
        setActivities(result.data || [])
      } else {
        setError(result.message || 'Failed to load activities')
      }
    } catch (err) {
      console.error('Error loading activities:', err)
      setError('Failed to load activities')
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
          <div>Loading activities...</div>
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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Activities
        </h1>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#fca5a5',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {activities.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
            <div style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>
              No activities yet
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Check back later for exciting activities
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {activities.map(activity => (
              <div
                key={activity.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                {activity.image_url && (
                  <div style={{
                    width: '100%',
                    height: '200px',
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
                        e.target.parentElement.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div style={{ padding: '24px' }}>
                  {activity.text && (
                    <p style={{
                      color: 'white',
                      fontSize: '16px',
                      lineHeight: '1.6',
                      margin: 0,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {activity.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

