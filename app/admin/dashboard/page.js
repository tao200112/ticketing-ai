'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState(null)
  const [stats, setStats] = useState({
    users: 0,
    merchants: 0,
    events: 0,
    orders: 0,
    tickets: 0
  })
  const [merchants, setMerchants] = useState([])
  const [events, setEvents] = useState([])
  const [inviteCodes, setInviteCodes] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    maxAttendees: '',
    ticketTypes: [],
    merchantId: ''
  })
  const router = useRouter()

  useEffect(() => {
    // Check admin login status
    const adminToken = localStorage.getItem('adminToken')
    const adminUserData = localStorage.getItem('adminUser')
    
    if (!adminToken || !adminUserData) {
      router.push('/admin/login')
      return
    }

    setAdminUser(JSON.parse(adminUserData))
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load server-side statistics
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Load merchants
      const merchantsResponse = await fetch('/api/admin/merchants')
      if (merchantsResponse.ok) {
        const merchantsData = await merchantsResponse.json()
      setMerchants(merchantsData)
      }

      // Load events
      const eventsResponse = await fetch('/api/admin/events')
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
      setEvents(eventsData)
      }

      // Load invite codes
      const inviteResponse = await fetch('/api/admin/invite-codes')
      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json()
        setInviteCodes(inviteData)
      }

      // Load customers
      const customersResponse = await fetch('/api/admin/customers')
      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        setCustomers(customersData)
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    router.push('/admin/login')
  }

  const generateInviteCode = async () => {
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
      })

      if (response.ok) {
        loadData() // Reload data
      } else {
        alert('Failed to generate invite code')
      }
    } catch (error) {
      console.error('Generate invite code error:', error)
      alert('Failed to generate invite code, please try again')
    }
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingEvent 
        ? `/api/admin/events/${editingEvent.id}`
        : '/api/admin/events/create'
      
      const method = editingEvent ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventForm)
      })

      if (response.ok) {
        setShowEventModal(false)
        setEditingEvent(null)
        setEventForm({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          location: '',
          maxAttendees: '',
          ticketTypes: [],
          merchantId: ''
        })
        loadData() // Reload data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save event')
      }
    } catch (error) {
      console.error('Event save error:', error)
      alert('Failed to save event, please try again')
    }
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      startDate: event.start_date ? event.start_date.split('T')[0] : '',
      endDate: event.end_date ? event.end_date.split('T')[0] : '',
      location: event.location || '',
      maxAttendees: event.max_attendees || '',
      ticketTypes: event.ticket_types || [],
      merchantId: event.merchant_id || ''
    })
    setShowEventModal(true)
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadData() // Reload data
      } else {
        alert('Failed to delete event')
      }
    } catch (error) {
      console.error('Event deletion error:', error)
      alert('Failed to delete event, please try again')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '18px' }}>Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paddingTop: '80px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
      }}>
        <div>
          <h1 style={{
              fontSize: '32px', 
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>
            Admin Dashboard
          </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
              Welcome back, {adminUser?.name || 'Admin'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
            cursor: 'pointer',
              transition: 'all 0.3s ease'
          }}
        >
          Logout
        </button>
      </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
      <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
        borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.users}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Total Users
            </div>
      </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.merchants}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Merchants
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.events}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Events
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.orders}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Orders
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.tickets}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Tickets
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          {['overview', 'merchants', 'events', 'customers', 'invite-codes'].map(tab => (
                  <button
              key={tab}
              onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}
            >
              {tab.replace('-', ' ')}
                  </button>
            ))}
        </div>

        {/* Tab Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
                System Overview
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Welcome to the PartyTix admin dashboard. Use the tabs above to manage different aspects of the system.
            </p>
          </div>
          )}

          {activeTab === 'merchants' && (
                    <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Merchants</h2>
                        <button
                  onClick={generateInviteCode}
                          style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                            borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Generate Invite Code
                        </button>
                      </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {merchants.length} merchants registered
                    </div>
                  </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Events Management</h2>
                <button
                  onClick={() => {
                    setEditingEvent(null)
                    setEventForm({
                      title: '',
                      description: '',
                      startDate: '',
                      endDate: '',
                      location: '',
                      maxAttendees: '',
                      ticketTypes: [],
                      merchantId: ''
                    })
                    setShowEventModal(true)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Create Event
                </button>
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {events.length} events created
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {events.map(event => (
                  <div
                    key={event.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                          {event.title}
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                          {event.description}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>📍 {event.location}</span>
                          <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
                          <span>👥 {event.max_attendees || 'Unlimited'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditEvent(event)}
                          style={{
                            background: 'rgba(34, 211, 238, 0.2)',
                            border: '1px solid rgba(34, 211, 238, 0.3)',
                            color: '#22D3EE',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      {activeTab === 'customers' && (
            <div>
              <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>Customers</h2>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {customers.length} customers registered
          </div>
        </div>
      )}

          {activeTab === 'invite-codes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Invite Codes</h2>
            <button
              onClick={generateInviteCode}
              style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                cursor: 'pointer',
                    fontSize: '14px'
              }}
            >
              Generate New Code
            </button>
          </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {inviteCodes.length} invite codes available
                  </div>
                    </div>
                  )}
                </div>
              </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'white', fontSize: '20px' }}>
                {editingEvent ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEventSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                    Description *
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="Enter event description"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                      Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                      End Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    placeholder="Enter event location"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                    Max Attendees
                  </label>
                  <input
                    type="number"
                    value={eventForm.maxAttendees}
                    onChange={(e) => setEventForm(prev => ({ ...prev, maxAttendees: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                    Merchant ID *
                  </label>
                  <select
                    value={eventForm.merchantId}
                    onChange={(e) => setEventForm(prev => ({ ...prev, merchantId: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select Merchant</option>
                    {merchants.map(merchant => (
                      <option key={merchant.id} value={merchant.id} style={{ color: 'black' }}>
                        {merchant.name} ({merchant.contact_email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}