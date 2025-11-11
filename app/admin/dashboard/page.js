'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import EventCreationForm from '../../../components/EventCreationForm'
import AdminNavbar from '@/components/AdminNavbar'

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
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [activityForm, setActivityForm] = useState({
    title: '',
    image_url: '',
    text: '',
    is_active: true
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [merchantSearch, setMerchantSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [editingMerchant, setEditingMerchant] = useState(null)
  const [maxEventsValue, setMaxEventsValue] = useState('')
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
      router.push('/admin')
      return
    }

    try {
      setAdminUser(JSON.parse(adminUserData))
      loadData()
    } catch (error) {
      console.error('Failed to parse admin user data:', error)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      router.push('/admin')
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

      // Load activities
      console.log('Fetching activities...')
      try {
        const activitiesResponse = await fetch('/api/admin/activities')
        console.log('Activities response:', activitiesResponse.status)
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json()
          console.log('Activities data:', activitiesData)
          setActivities(Array.isArray(activitiesData) ? activitiesData : [])
        } else {
          console.error('Activities fetch failed:', activitiesResponse.status)
          const errorText = await activitiesResponse.text()
          console.error('Activities error response:', errorText)
          setActivities([])
        }
      } catch (activitiesError) {
        console.error('Error fetching activities:', activitiesError)
        setActivities([])
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
    router.push('/admin')
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
      
      // 转换字段名以匹配API期望
      const apiData = {
        title: eventData.title,
        description: eventData.description,
        startTime: eventData.startDate ? `${eventData.startDate}T${eventData.startTime || '00:00'}:00.000Z` : eventData.startTime,
        endTime: eventData.endDate ? `${eventData.endDate}T${eventData.endTime || '23:59'}:59.999Z` : eventData.endTime,
        location: eventData.location,
        maxAttendees: eventData.maxAttendees,
        merchant_id: eventData.merchantId,
        prices: eventData.ticketTypes?.map(ticket => ({
          name: ticket.name,
          amount_cents: parseInt(ticket.amount_cents),
          inventory: parseInt(ticket.inventory),
          limit_per_user: parseInt(ticket.limit_per_user) || 4
        })) || []
      }
      
      console.log('🔍 发送事件数据:', apiData)
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
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
      startDate: event.start_at ? event.start_at.split('T')[0] : '',
      endDate: event.end_at ? event.end_at.split('T')[0] : '',
      location: event.location || event.address || '',
      maxAttendees: event.max_attendees || '',
      ticketTypes: event.prices || [],
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

  const handleUpdateMerchantMaxEvents = async (merchantId, maxEvents) => {
    try {
      const response = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_events: maxEvents })
      })

      if (response.ok) {
        loadData() // Reload data to reflect changes
        setEditingMerchant(null)
        setMaxEventsValue('')
      } else {
        alert('Failed to update merchant max events')
      }
    } catch (error) {
      console.error('Error updating merchant max events:', error)
      alert('Failed to update merchant max events')
    }
  }

  // Filter functions
  const filteredMerchants = merchants.filter(merchant => {
    if (!merchantSearch) return true
    const search = merchantSearch.toLowerCase()
    return (
      merchant.name?.toLowerCase().includes(search) ||
      merchant.contact_email?.toLowerCase().includes(search) ||
      merchant.contact_phone?.toLowerCase().includes(search)
    )
  })

  const filteredEvents = events.filter(event => {
    if (!eventSearch) return true
    const search = eventSearch.toLowerCase()
    return (
      event.title?.toLowerCase().includes(search) ||
      event.description?.toLowerCase().includes(search) ||
      event.venue_name?.toLowerCase().includes(search) ||
      event.address?.toLowerCase().includes(search) ||
      event.merchants?.name?.toLowerCase().includes(search)
    )
  })

  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch) return true
    const search = customerSearch.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    )
  })

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
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      paddingTop: '80px'
    }}>
      <AdminNavbar />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
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
          {['overview', 'merchants', 'events', 'customers', 'tickets', 'invite-codes', 'activities'].map(tab => (
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
              
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search merchants by name, email, or phone..."
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {filteredMerchants.length} of {merchants.length} merchants
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredMerchants.map(merchant => (
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
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span>📞 {merchant.contact_phone || 'No phone'}</span>
                          <span>✅ {merchant.verified ? 'Verified' : 'Unverified'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📊 Max Events:</span>
                            {editingMerchant === merchant.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={maxEventsValue}
                                  onChange={(e) => setMaxEventsValue(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateMerchantMaxEvents(merchant.id, parseInt(maxEventsValue) || 1)
                                    }
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '12px',
                                    outline: 'none'
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateMerchantMaxEvents(merchant.id, parseInt(maxEventsValue) || 1)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#22c55e',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMerchant(null)
                                    setMaxEventsValue('')
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{merchant.max_events || 1}</span>
                                <button
                                  onClick={() => {
                                    setEditingMerchant(merchant.id)
                                    setMaxEventsValue(merchant.max_events?.toString() || '1')
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(34, 211, 238, 0.2)',
                                    border: '1px solid rgba(34, 211, 238, 0.3)',
                                    color: '#22D3EE',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    marginLeft: '4px'
                                  }}
                                  title="Edit max events"
                                >
                                  ✎
                                </button>
                              </div>
                            )}
                          </div>
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
                        location: '201 N Main St SUITE A, Blacksburg, VA 24060',
                        address: '201 N Main St SUITE A, Blacksburg, VA 24060',
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
              
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search events by title, description, venue, or merchant..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {filteredEvents.length} of {events.length} events
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredEvents.map(event => (
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
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span>📍 {event.venue_name || event.location || 'N/A'}</span>
                          <span>📅 {event.start_at ? new Date(event.start_at).toLocaleDateString() : 'Invalid Date'}</span>
                          <span>👥 {event.max_attendees || 'Unlimited'}</span>
                        </div>
                        {event.merchants && (
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            fontSize: '12px', 
                            color: 'rgba(139, 92, 246, 0.9)',
                            background: 'rgba(139, 92, 246, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                          }}>
                            <span>🏪</span>
                            <span style={{ fontWeight: '500' }}>
                              商家: {event.merchants.name || 'Unknown Merchant'}
                            </span>
                          </div>
                        )}
                        {!event.merchants && event.merchant_id && (
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            fontSize: '12px', 
                            color: 'rgba(139, 92, 246, 0.9)',
                            background: 'rgba(139, 92, 246, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                          }}>
                            <span>🏪</span>
                            <span style={{ fontWeight: '500' }}>
                              商家ID: {event.merchant_id.substring(0, 8)}...
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/events/${event.id}/reorder`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ direction: 'up' })
                                })
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result = await response.json()
                                  if (result.message !== 'Cannot move further') {
                                    alert(result.message || 'Failed to move event')
                                  }
                                }
                              } catch (error) {
                                console.error('Error reordering event:', error)
                                alert('Failed to move event')
                              }
                            }}
                            style={{
                              background: 'rgba(124, 58, 237, 0.2)',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/events/${event.id}/reorder`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ direction: 'down' })
                                })
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result = await response.json()
                                  if (result.message !== 'Cannot move further') {
                                    alert(result.message || 'Failed to move event')
                                  }
                                }
                              } catch (error) {
                                console.error('Error reordering event:', error)
                                alert('Failed to move event')
                              }
                            }}
                            style={{
                              background: 'rgba(124, 58, 237, 0.2)',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => window.open(`/events/${event.id}`, '_blank')}
                          style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
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
              
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search customers by name or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {filteredCustomers.length} of {customers.length} customers
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredCustomers.map(customer => (
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
                            Used At: {new Date(ticket.used_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
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
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', flexWrap: 'wrap' }}>
                          <span>📅 Created: {new Date(inviteCode.created_at).toLocaleDateString()}</span>
                          <span>⏰ Expires: {new Date(inviteCode.expires_at).toLocaleDateString()}</span>
                          {inviteCode.used_by ? (
                            <>
                              <span>👤 Used by: {inviteCode.used_by.substring(0, 8)}...</span>
                              {inviteCode.used_at && (
                                <span>📆 Used at: {new Date(inviteCode.used_at).toLocaleDateString()}</span>
                              )}
                            </>
                          ) : (
                            <span>👤 Used by: Not used</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          background: inviteCode.used_by ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 211, 238, 0.2)',
                          color: inviteCode.used_by ? '#22c55e' : '#22D3EE',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {inviteCode.used_by ? 'Used' : 'Unused'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'white', fontSize: '20px' }}>Activities</h2>
                <button
                  onClick={() => {
                    setEditingActivity(null)
                    setActivityForm({ title: '', image_url: '', text: '', is_active: true })
                    setImagePreview(null)
                    const fileInput = document.getElementById('activity-image-upload')
                    if (fileInput) fileInput.value = ''
                    setShowActivityModal(true)
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
                  Create Activity
                </button>
              </div>
              
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                {activities.length} activities
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {activities.map(activity => (
                  <div
                    key={activity.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
                      {activity.image_url && (
                        <div style={{
                          width: '200px',
                          height: '150px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0,
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
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '12px',
                          lineHeight: '1.4'
                        }}>
                          {activity.title || 'Untitled Activity'}
                        </h3>
                        <p style={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '16px',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {activity.text}
                        </p>
                        <Link
                          href={`/activity/${activity.id}`}
                          target="_blank"
                          style={{
                            display: 'inline-block',
                            color: 'rgba(124, 58, 237, 0.9)',
                            fontSize: '12px',
                            textDecoration: 'none',
                            marginTop: '8px'
                          }}
                        >
                          View full content →
                        </Link>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <span>📅 Created: {new Date(activity.created_at).toLocaleDateString()}</span>
                          <span style={{
                            background: activity.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: activity.is_active ? '#22c55e' : '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {activity.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/activities/${activity.id}/reorder`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ direction: 'up' })
                                })
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result = await response.json()
                                  if (result.message !== 'Cannot move further') {
                                    alert(result.message || 'Failed to move activity')
                                  }
                                }
                              } catch (error) {
                                console.error('Error reordering activity:', error)
                                alert('Failed to move activity')
                              }
                            }}
                            style={{
                              background: 'rgba(124, 58, 237, 0.2)',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/activities/${activity.id}/reorder`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ direction: 'down' })
                                })
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result = await response.json()
                                  if (result.message !== 'Cannot move further') {
                                    alert(result.message || 'Failed to move activity')
                                  }
                                }
                              } catch (error) {
                                console.error('Error reordering activity:', error)
                                alert('Failed to move activity')
                              }
                            }}
                            style={{
                              background: 'rgba(124, 58, 237, 0.2)',
                              border: '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setEditingActivity(activity)
                            setActivityForm({
                              title: activity.title || '',
                              image_url: activity.image_url || '',
                              text: activity.text || '',
                              is_active: activity.is_active !== false
                            })
                            setImagePreview(activity.image_url || null)
                            setShowActivityModal(true)
                          }}
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
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this activity?')) {
                              try {
                                const response = await fetch(`/api/admin/activities/${activity.id}`, {
                                  method: 'DELETE'
                                })
                                if (response.ok) {
                                  loadData()
                                } else {
                                  alert('Failed to delete activity')
                                }
                              } catch (error) {
                                console.error('Error deleting activity:', error)
                                alert('Failed to delete activity')
                              }
                            }
                          }}
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

      {/* Activity Modal */}
      {showActivityModal && (
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
            background: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setShowActivityModal(false)
                setEditingActivity(null)
                setActivityForm({ title: '', image_url: '', text: '', is_active: true })
                setImagePreview(null)
                const fileInput = document.getElementById('activity-image-upload')
                if (fileInput) fileInput.value = ''
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            <h2 style={{ color: 'white', fontSize: '24px', marginBottom: '24px' }}>
              {editingActivity ? 'Edit Activity' : 'Create Activity'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter activity title..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Image
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        // Validate file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File size must be less than 5MB')
                          return
                        }

                        // Show preview
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setImagePreview(event.target?.result)
                        }
                        reader.readAsDataURL(file)

                        // Upload file
                        setUploadingImage(true)
                        try {
                          const formData = new FormData()
                          formData.append('file', file)

                          const response = await fetch('/api/admin/upload', {
                            method: 'POST',
                            body: formData
                          })

                          const result = await response.json()

                          if (result.success) {
                            setActivityForm(prev => ({ ...prev, image_url: result.url }))
                          } else {
                            alert(result.message || 'Failed to upload image')
                            setImagePreview(null)
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error)
                          alert('Failed to upload image')
                          setImagePreview(null)
                        } finally {
                          setUploadingImage(false)
                        }
                      }}
                      style={{ display: 'none' }}
                      id="activity-image-upload"
                    />
                    <label
                      htmlFor="activity-image-upload"
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: uploadingImage ? 'rgba(255, 255, 255, 0.1)' : 'rgba(124, 58, 237, 0.2)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: uploadingImage ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'center',
                        width: '100%'
                      }}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={activityForm.image_url}
                    onChange={(e) => {
                      setActivityForm(prev => ({ ...prev, image_url: e.target.value }))
                      if (e.target.value) {
                        setImagePreview(e.target.value)
                      } else {
                        setImagePreview(null)
                      }
                    }}
                    placeholder="Or enter image URL"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                {(imagePreview || activityForm.image_url) && (
                  <div style={{
                    marginTop: '12px',
                    width: '100%',
                    height: '200px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.1)',
                    position: 'relative'
                  }}>
                    <img
                      src={imagePreview || activityForm.image_url}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    {activityForm.image_url && (
                      <button
                        onClick={() => {
                          setActivityForm(prev => ({ ...prev, image_url: '' }))
                          setImagePreview(null)
                          const fileInput = document.getElementById('activity-image-upload')
                          if (fileInput) fileInput.value = ''
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.8)',
                          border: 'none',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Text *
                </label>
                <textarea
                  value={activityForm.text}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter activity text..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={activityForm.is_active}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <label style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}>
                  Active (visible on Activity page)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setShowActivityModal(false)
                    setEditingActivity(null)
                    setActivityForm({ title: '', image_url: '', text: '', is_active: true })
                    setImagePreview(null)
                    const fileInput = document.getElementById('activity-image-upload')
                    if (fileInput) fileInput.value = ''
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!activityForm.title || activityForm.title.trim() === '') {
                      alert('Please enter activity title')
                      return
                    }
                    if (!activityForm.text || activityForm.text.trim() === '') {
                      alert('Please enter activity text')
                      return
                    }

                    try {
                      const url = editingActivity
                        ? `/api/admin/activities/${editingActivity.id}`
                        : '/api/admin/activities'
                      const method = editingActivity ? 'PUT' : 'POST'

                      const response = await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(activityForm)
                      })

                      const result = await response.json()

                      if (response.ok && result.success) {
                        setShowActivityModal(false)
                        setEditingActivity(null)
                        setActivityForm({ image_url: '', text: '', is_active: true })
                        setImagePreview(null)
                        const fileInput = document.getElementById('activity-image-upload')
                        if (fileInput) fileInput.value = ''
                        loadData()
                      } else {
                        // Show detailed error message
                        const errorMsg = result.message || result.error || 'Failed to save activity'
                        console.error('Activity save error:', result)
                        alert(`Error: ${errorMsg}`)
                      }
                    } catch (error) {
                      console.error('Error saving activity:', error)
                      alert(`Failed to save activity: ${error.message || error}`)
                    }
                  }}
                  className="btn-partytix-gradient"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}