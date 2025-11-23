'use client'

import Link from "next/link"
import React, { useState, useEffect } from "react"
import NavbarPartyTix from "@/components/NavbarPartyTix"
import EventCard from "@/components/events/EventCard"
import { SkeletonGrid } from "@/components/events/SkeletonCard"
import { useEvents } from "@/lib/hooks/use-api"

export default function BlacksburgPage() {
  // Use new API hook
  const { data: apiEvents, loading: apiLoading, error: apiError } = useEvents()
  const [localEvents, setLocalEvents] = useState([])
  const [activities, setActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  console.log('🏠 Home 组件渲染:', { apiEvents, apiLoading, apiError })

  useEffect(() => {
    loadLocalEvents()
    loadActivities()
    
    // Listen to localStorage changes for real-time updates
    const handleStorageChange = (e) => {
      if (e.key === 'merchantEvents') {
        loadLocalEvents()
      }
    }
    
    // Add page visibility change listener to refresh data when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible again, refreshing event data')
        // Trigger useEvents to refetch data
        if (window.refreshEvents) {
          window.refreshEvents()
        }
        loadActivities()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true)
      const response = await fetch('/api/activities')
      const result = await response.json()
      if (result.success) {
        setActivities(result.data || [])
      }
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setActivitiesLoading(false)
    }
  }

  // No longer using localStorage, all events fetched from Supabase API
  const loadLocalEvents = () => {
    setLocalEvents([])
  }

  // Merge API data and local data
  const events = React.useMemo(() => {
    console.log('🔍 Starting to merge event data:', { apiEvents, apiLoading, apiError })
    
    // Use API returned event data and default events
    let allEvents = []
    
    // Add API events
    if (apiEvents && Array.isArray(apiEvents) && apiEvents.length > 0) {
      console.log('✅ Adding API events:', apiEvents.length)
      allEvents = [...apiEvents]
    } else {
      console.log('⚠️ API events empty or invalid:', apiEvents)
    }
    
    
    // Filter out test events
    const filteredEvents = allEvents.filter(event => {
      const title = event.title || event.name || ''
      return title.length > 1 && title !== '11' && title !== 'bb' && title !== 'aa'
    })
    
    console.log(`📊 Event statistics - API: ${apiEvents?.length || 0}, Final: ${filteredEvents.length}`)
    
    // Return only first 3 (sorted by sort_order, already sorted in API)
    return filteredEvents.slice(0, 3)
  }, [apiEvents, apiLoading, apiError]) // Add more dependencies to ensure data updates

  // Get first 3 activities
  const featuredActivities = React.useMemo(() => {
    return activities.slice(0, 3)
  }, [activities])

  // Update loading state - improved loading logic
  useEffect(() => {
    if (apiLoading) {
      setLoading(true)
    } else {
      // Delay a bit to ensure data is fully loaded
      const timer = setTimeout(() => {
        setLoading(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [apiLoading])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      <NavbarPartyTix />
      
      {/* Hero Section */}
      <div style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            Welcome to <span className="text-partytix-gradient">PartyTix</span>
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#cbd5e1', 
            marginBottom: '32px', 
            maxWidth: '600px', 
            margin: '0 auto 32px auto',
            lineHeight: '1.6'
          }}>
            Discover amazing events, buy tickets, and enjoy unforgettable experiences. From concerts to food festivals, everything is on PartyTix.
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Link href="/events" className="btn-partytix-gradient">
              Browse Events
            </Link>
            <Link href="/auth/register" style={{
              padding: '12px 24px',
              backgroundColor: '#374151',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'background-color 0.3s'
            }}>
              Register Account
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <div style={{ paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '32px', 
            textAlign: 'center' 
          }}>
            Featured Events
          </h2>

          {loading ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '300px',
                  backgroundColor: '#374151',
                  borderRadius: '12px',
                  animation: 'pulse 2s infinite'
                }}></div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎪</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                No Events Available
              </h3>
              <p style={{ color: '#94a3b8' }}>Stay tuned for more exciting events</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/events" className="btn-partytix-gradient">
              Browse Events
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Activity */}
      <div style={{ paddingBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '32px', 
            textAlign: 'center' 
          }}>
            Featured Activity
          </h2>

          {activitiesLoading ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '300px',
                  backgroundColor: '#374151',
                  borderRadius: '12px',
                  animation: 'pulse 2s infinite'
                }}></div>
              ))}
            </div>
          ) : featuredActivities.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              {featuredActivities.map((activity) => (
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
                    <h3 style={{
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '600',
                      marginBottom: '12px',
                      lineHeight: '1.4'
                    }}>
                      {activity.title || 'Untitled Activity'}
                    </h3>
                    {activity.text && (() => {
                      const previewText = activity.text.length > 150
                        ? activity.text.substring(0, 150) + '...'
                        : activity.text
                      return (
                        <>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            margin: 0,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {previewText}
                          </p>
                          {activity.text.length > 150 && (
                            <Link
                              href={`/activity/${activity.id}`}
                              style={{
                                display: 'inline-block',
                                marginTop: '12px',
                                color: 'rgba(124, 58, 237, 0.9)',
                                fontSize: '14px',
                                fontWeight: '500',
                                textDecoration: 'none'
                              }}
                            >
                              Read more →
                            </Link>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📸</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                No Activities Available
              </h3>
              <p style={{ color: '#94a3b8' }}>Check back later for exciting activities</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/activity" className="btn-partytix-gradient">
              Browse Activity
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}

