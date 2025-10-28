'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EventCreationForm from '../../../components/EventCreationForm'
import NavbarPartyTix from '../../../components/NavbarPartyTix'

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
  const [tickets, setTickets] = useState([])
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

    try {
      setAdminUser(JSON.parse(adminUserData))
      loadData()
    } catch (error) {
      console.error('Failed to parse admin user data:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      router.push('/admin/login')
    }
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('Loading admin data...')
      
      // Load server-side statistics
      console.log('Fetching stats...')
      const statsResponse = await fetch('/api/admin/stats')
      console.log('Stats response:', statsResponse.status)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('Stats data:', statsData)
        setStats(statsData)
      } else {
        console.error('Stats fetch failed:', statsResponse.status)
        setStats({
          users: 0,
          merchants: 0,
          events: 0,
          orders: 0,
          tickets: 0
        })
      }

      // Load merchants
      console.log('Fetching merchants...')
      const merchantsResponse = await fetch('/api/admin/merchants')
      console.log('Merchants response:', merchantsResponse.status)
      if (merchantsResponse.ok) {
        const merchantsData = await merchantsResponse.json()
        console.log('Merchants data:', merchantsData)
        setMerchants(merchantsData)
      } else {
        console.error('Merchants fetch failed:', merchantsResponse.status)
        setMerchants([])
      }

      // Load events
      console.log('Fetching events...')
      const eventsResponse = await fetch('/api/admin/events')
      console.log('Events response:', eventsResponse.status)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        console.log('Events data:', eventsData)
        setEvents(eventsData)
      } else {
        console.error('Events fetch failed:', eventsResponse.status)
        setEvents([])
      }

      // Load invite codes
      console.log('Fetching invite codes...')
      const inviteResponse = await fetch('/api/admin/invite-codes')
      console.log('Invite codes response:', inviteResponse.status)
      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json()
        console.log('Invite codes data:', inviteData)
        // Handle different response formats
        if (inviteData.inviteCodes) {
          setInviteCodes(inviteData.inviteCodes)
        } else {
          setInviteCodes(inviteData)
        }
      } else {
        console.error('Invite codes fetch failed:', inviteResponse.status)
        setInviteCodes([])
      }

      // Load customers
      console.log('Fetching customers...')
      const customersResponse = await fetch('/api/admin/customers')
      console.log('Customers response:', customersResponse.status)
      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        console.log('Customers data:', customersData)
        setCustomers(customersData)
      } else {
        console.error('Customers fetch failed:', customersResponse.status)
        setCustomers([])
      }

      // Load tickets
      console.log('Fetching tickets...')
      const ticketsResponse = await fetch('/api/admin/tickets')
      console.log('Tickets response:', ticketsResponse.status)
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        console.log('Tickets data:', ticketsData)
        // Handle both array and object response formats
        if (Array.isArray(ticketsData)) {
          setTickets(ticketsData)
        } else if (ticketsData.tickets) {
          setTickets(ticketsData.tickets)
        } else {
          setTickets([])
        }
      } else {
        console.error('Tickets fetch failed:', ticketsResponse.status)
        setTickets([])
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

  const handleEventSubmit = async (eventData) => {
    try {
      const url = editingEvent 
        ? `/api/events/${editingEvent.id}`
        : '/api/events'
      
      const method = editingEvent ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
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
        return true
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save event')
      }
    } catch (error) {
      console.error('Event save error:', error)
      throw error
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
      const response = await fetch(`/api/events/${eventId}`, {
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
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: 'white',
          maxWidth: '500px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading admin dashboard...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
    }}>
      <NavbarPartyTix />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '100px 24px 40px 24px'
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
          className="btn-partytix-gradient"
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
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
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
        borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.users}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Total Users
            </div>
      </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.merchants}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Merchants
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.events}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Events
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {stats.orders}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Orders
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
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
          {['overview', 'merchants', 'events', 'customers', 'tickets', 'invite-codes'].map(tab => (
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
          <button
            onClick={() => window.location.href = '/admin/contact-messages'}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}
          >
            Contact Messages
          </button>
        </div>

        {/* Tab Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
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
                  className="btn-partytix-gradient"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Generate Invite Code
                </button>
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {merchants.length} merchants registered
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {merchants.map(merchant => (
                  <div
                    key={merchant.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                          {merchant.name}
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                          {merchant.contact_email}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>📞 {merchant.contact_phone || 'No phone'}</span>
                          <span>✅ {merchant.verified ? 'Verified' : 'Unverified'}</span>
                          <span>📊 Max Events: {merchant.max_events}</span>
                          <span>📅 Created: {new Date(merchant.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          background: merchant.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: merchant.status === 'active' ? '#22c55e' : '#ef4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {merchant.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Events Management</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      // 编辑默认的Ridiculous Chicken活动
                      const defaultEvent = {
                        id: 'ridiculous-chicken',
                        title: 'Ridiculous Chicken Night Event',
                        description: 'Enjoy delicious chicken and an amazing night at Virginia Tech\'s most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.',
                        start_date: '2025-10-25T20:00:00Z',
                        end_date: '2025-10-25T23:00:00Z',
                        location: 'Shanghai Concert Hall',
                        max_attendees: 150,
                        merchant_id: 'default-merchant',
                        ticket_types: [
                          {
                            name: 'Regular Ticket (21+)',
                            amount_cents: 1500,
                            inventory: 100,
                            limit_per_user: 5
                          },
                          {
                            name: 'Special Ticket (18-20)',
                            amount_cents: 3000,
                            inventory: 50,
                            limit_per_user: 2
                          }
                        ]
                      }
                      handleEditEvent(defaultEvent)
                    }}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22c55e',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Edit Ridiculous Chicken
                  </button>
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
                    className="btn-partytix-gradient"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Create Event
                  </button>
                </div>
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {events.length} events created
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {events.map(event => (
                  <div
                    key={event.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
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
                          onClick={() => window.open(`/events/${event.id}`, '_blank')}
                          style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginRight: '8px'
                          }}
                        >
                          View
                        </button>
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
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {customers.length} customers registered
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                          {customer.name}
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                          {customer.email}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>👤 Age: {customer.age}</span>
                          <span>🎭 Role: {customer.role}</span>
                          <span>📅 Joined: {new Date(customer.created_at).toLocaleDateString()}</span>
                          <span>✅ {customer.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          background: customer.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: customer.is_active ? '#22c55e' : '#ef4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>Tickets Management</h2>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {tickets.length} tickets sold
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                          Ticket #{ticket.short_id || ticket.id.substring(0, 8)}
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '8px' }}>
                          {ticket.holder_email || 'No email'}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>🎫 Tier: {ticket.tier || 'General'}</span>
                          <span>💰 Price: ${ticket.price_cents ? (ticket.price_cents / 100).toFixed(2) : 'N/A'}</span>
                          <span>📅 Issued: {new Date(ticket.issued_at || ticket.created_at).toLocaleDateString()}</span>
                          <span>🔗 Order: {ticket.order_id ? ticket.order_id.substring(0, 8) + '...' : 'N/A'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          background: ticket.status === 'used' ? 'rgba(34, 197, 94, 0.2)' : 
                                     ticket.status === 'unused' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: ticket.status === 'used' ? '#22c55e' : 
                                 ticket.status === 'unused' ? '#22D3EE' : '#ef4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {ticket.status || 'Unknown'}
                        </span>
                        {ticket.used_at && (
                          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            Used: {new Date(ticket.used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {ticket.qr_payload && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        wordBreak: 'break-all'
                      }}>
                        QR Payload: {ticket.qr_payload.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invite-codes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Invite Codes</h2>
            <button
              onClick={generateInviteCode}
              className="btn-partytix-gradient"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Generate New Code
            </button>
          </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {inviteCodes.length} invite codes available
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {inviteCodes.map(inviteCode => (
                  <div
                    key={inviteCode.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>
                          {inviteCode.code}
                        </h3>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>📅 Created: {new Date(inviteCode.created_at).toLocaleDateString()}</span>
                          <span>⏰ Expires: {new Date(inviteCode.expires_at).toLocaleDateString()}</span>
                          <span>👤 Used by: {inviteCode.used_by ? inviteCode.used_by.substring(0, 8) + '...' : 'Not used'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          background: inviteCode.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: inviteCode.is_active ? '#22c55e' : '#ef4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textTransform: 'capitalize'
                        }}>
                          {inviteCode.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
            <button
              onClick={() => setShowEventModal(false)}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001
              }}
            >
              ×
            </button>
            <EventCreationForm
              onSubmit={handleEventSubmit}
              onCancel={() => setShowEventModal(false)}
              initialData={editingEvent}
              isEditing={!!editingEvent}
              merchantId={editingEvent?.merchant_id || (merchants.length > 0 ? merchants[0].id : 'admin-created')}
            />
          </div>
        </div>
      )}
    </div>
  )
}