'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [merchantSearch, setMerchantSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [editingMerchant, setEditingMerchant] = useState(null)
  const [maxEventsValue, setMaxEventsValue] = useState('')
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

  const [generatingInviteCode, setGeneratingInviteCode] = useState(false)
  const [inviteCodeMessage, setInviteCodeMessage] = useState({ type: '', text: '' })

  const generateInviteCode = async () => {
    setGeneratingInviteCode(true)
    setInviteCodeMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
      })

      const result = await response.json()

      if (response.ok && result) {
        // 成功：重新加载数据并显示成功提示
        setInviteCodeMessage({ 
          type: 'success', 
          text: `Invite code "${result.code}" created successfully!` 
        })
        // 清除提示（3秒后）
        setTimeout(() => setInviteCodeMessage({ type: '', text: '' }), 3000)
        // 重新加载邀请码列表
        loadData()
      } else {
        // 失败：显示错误信息
        const errorMessage = result.error || result.message || 'Failed to generate invite code'
        const errorDetails = result.details ? ` (${result.details})` : ''
        console.error('❌ Failed to generate invite code:', {
          status: response.status,
          error: errorMessage,
          details: result.details,
          fullResponse: result
        })
        setInviteCodeMessage({ 
          type: 'error', 
          text: errorMessage + errorDetails
        })
        // 清除错误提示（5秒后）
        setTimeout(() => setInviteCodeMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      console.error('❌ Generate invite code error:', error)
      setInviteCodeMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      })
      // 清除错误提示（5秒后）
      setTimeout(() => setInviteCodeMessage({ type: '', text: '' }), 5000)
    } finally {
      setGeneratingInviteCode(false)
    }
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
        loadData()
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max_events: maxEvents })
      })

      if (response.ok) {
        loadData()
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
  const filteredMerchants = merchants.filter((merchant) => {
    if (!merchantSearch) return true
    const search = merchantSearch.toLowerCase()
    return (
      merchant.name?.toLowerCase().includes(search) ||
      merchant.email?.toLowerCase().includes(search) ||
      merchant.contact_phone?.toLowerCase().includes(search)
    )
  })

  const filteredEvents = events.filter((event) => {
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

  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearch) return true
    const search = customerSearch.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div
          style={{
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
          }}
        >
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>
            Loading admin dashboard...
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}
          ></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        paddingTop: '80px'
      }}
    >
      <AdminNavbar />
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              Admin Dashboard
            </h1>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px'
              }}
            >
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {stats.users}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Total Users
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {stats.merchants}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Merchants
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {stats.events}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Events
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {stats.orders}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Orders
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {stats.tickets}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px'
              }}
            >
              Tickets
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px',
            borderRadius: '8px',
            width: 'fit-content'
          }}
        >
          {[
            'overview',
            'merchants',
            'events',
            'customers',
            'tickets',
            'invite-codes',
            'activities'
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background:
                  activeTab === tab
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'transparent',
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
            onClick={() =>
              (window.location.href = '/admin/contact-messages')
            }
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
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          {activeTab === 'overview' && (
            <div>
              <h2
                style={{
                  color: 'white',
                  marginBottom: '20px',
                  fontSize: '20px'
                }}
              >
                System Overview
              </h2>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                Welcome to the PartyTix admin dashboard. Use the tabs above to
                manage different aspects of the system.
              </p>
            </div>
          )}

          {activeTab === 'merchants' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <h2
                  style={{ color: 'white', fontSize: '20px' }}
                >
                  Merchants
                </h2>
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

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {filteredMerchants.length} of {merchants.length} merchants
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredMerchants.map((merchant) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}
                        >
                          {merchant.name}
                        </h3>
                        <p
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            marginBottom: '8px'
                          }}
                        >
                          {merchant.email}
                        </p>
                        {merchant.temp_password && (
                          <p
                            style={{
                              color: 'rgba(255, 255, 0, 0.9)',
                              fontSize: '13px',
                              marginBottom: '8px',
                              fontWeight: 'bold',
                              fontFamily: 'monospace',
                              background: 'rgba(255, 255, 0, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}
                          >
                            🔑 密码: {merchant.temp_password}
                          </p>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            flexWrap: 'wrap',
                            alignItems: 'center'
                          }}
                        >
                          <span>
                            📞 {merchant.contact_phone || 'No phone'}
                          </span>
                          <span>✅{merchant.verified ? 'Verified' : 'Unverified'}</span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span>📊 Max Events:</span>
                            {editingMerchant === merchant.id ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <input
                                  type="number"
                                  min="1"
                                  value={maxEventsValue}
                                  onChange={(e) =>
                                    setMaxEventsValue(e.target.value)
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateMerchantMaxEvents(
                                        merchant.id,
                                        parseInt(maxEventsValue) || 1
                                      )
                                    }
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border:
                                      '1px solid rgba(255, 255, 255, 0.3)',
                                    background:
                                      'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    fontSize: '12px',
                                    outline: 'none'
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleUpdateMerchantMaxEvents(
                                      merchant.id,
                                      parseInt(maxEventsValue) || 1
                                    )
                                  }
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background:
                                      'rgba(34, 197, 94, 0.2)',
                                    border:
                                      '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#22c55e',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  ✔
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMerchant(null)
                                    setMaxEventsValue('')
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background:
                                      'rgba(239, 68, 68, 0.2)',
                                    border:
                                      '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>{merchant.max_events || 1}</span>
                                <button
                                  onClick={() => {
                                    setEditingMerchant(merchant.id)
                                    setMaxEventsValue(
                                      merchant.max_events?.toString() ||
                                        '1'
                                    )
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background:
                                      'rgba(34, 211, 238, 0.2)',
                                    border:
                                      '1px solid rgba(34, 211, 238, 0.3)',
                                    color: '#22D3EE',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    marginLeft: '4px'
                                  }}
                                  title="Edit max events"
                                >
                                  ✏
                                </button>
                              </div>
                            )}
                          </div>
                          <span>
                            📅 Created:{' '}
                            {new Date(
                              merchant.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            background:
                              merchant.status === 'active'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              merchant.status === 'active'
                                ? '#22c55e'
                                : '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textTransform: 'capitalize'
                          }}
                        >
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <h2
                  style={{ color: 'white', fontSize: '20px' }}
                >
                  Events Management
                </h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link
                    href="/admin/events/new"
                    className="btn-partytix-gradient"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    创建活动
                  </Link>
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

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {filteredEvents.length} of {events.length} events
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredEvents.map((event) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}
                        >
                          {event.title}
                        </h3>
                        <p
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            marginBottom: '8px'
                          }}
                        >
                          {event.description}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginBottom: '8px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span>
                            📍{' '}
                            {event.venue_name ||
                              event.location ||
                              'N/A'}
                          </span>
                          <span>
                            📅{' '}
                            {event.start_at
                              ? new Date(
                                  event.start_at
                                ).toLocaleDateString()
                              : 'Invalid Date'}
                          </span>
                          <span>
                            👥{' '}
                            {event.max_attendees ||
                              'Unlimited'}
                          </span>
                        </div>
                        {event.merchants && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color:
                                'rgba(139, 92, 246, 0.9)',
                              background:
                                'rgba(139, 92, 246, 0.1)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border:
                                '1px solid rgba(139, 92, 246, 0.2)'
                            }}
                          >
                            <span>🏪</span>
                            <span
                              style={{
                                fontWeight: '500'
                              }}
                            >
                              Merchant:{' '}
                              {event.merchants.name ||
                                'Unknown Merchant'}
                            </span>
                          </div>
                        )}
                        {!event.merchants &&
                          event.merchant_id && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                color:
                                  'rgba(139, 92, 246, 0.9)',
                                background:
                                  'rgba(139, 92, 246, 0.1)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border:
                                  '1px solid rgba(139, 92, 246, 0.2)'
                              }}
                            >
                              <span>🏪</span>
                              <span
                                style={{
                                  fontWeight: '500'
                                }}
                              >
                                Merchant ID:{' '}
                                {event.merchant_id.substring(
                                  0,
                                  8
                                )}
                                ...
                              </span>
                            </div>
                          )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexDirection: 'column'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px'
                          }}
                        >
                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await fetch(
                                    `/api/admin/events/${event.id}/reorder`,
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type':
                                          'application/json'
                                      },
                                      body: JSON.stringify({
                                        direction: 'up'
                                      })
                                    }
                                  )
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result =
                                    await response.json()
                                  if (
                                    result.message !==
                                    'Cannot move further'
                                  ) {
                                    alert(
                                      result.message ||
                                        'Failed to move event'
                                    )
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  'Error reordering event:',
                                  error
                                )
                                alert('Failed to move event')
                              }
                            }}
                            style={{
                              background:
                                'rgba(124, 58, 237, 0.2)',
                              border:
                                '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move up"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await fetch(
                                    `/api/admin/events/${event.id}/reorder`,
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type':
                                          'application/json'
                                      },
                                      body: JSON.stringify({
                                        direction: 'down'
                                      })
                                    }
                                  )
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result =
                                    await response.json()
                                  if (
                                    result.message !==
                                    'Cannot move further'
                                  ) {
                                    alert(
                                      result.message ||
                                        'Failed to move event'
                                    )
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  'Error reordering event:',
                                  error
                                )
                                alert('Failed to move event')
                              }
                            }}
                            style={{
                              background:
                                'rgba(124, 58, 237, 0.2)',
                              border:
                                '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move down"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            window.open(
                              `/events/${event.id}`,
                              '_blank'
                            )
                          }
                          style={{
                            background:
                              'rgba(34, 197, 94, 0.2)',
                            border:
                              '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View
                        </button>
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          style={{
                            background:
                              'rgba(34, 211, 238, 0.2)',
                            border:
                              '1px solid rgba(34, 211, 238, 0.3)',
                            color: '#22D3EE',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-block'
                          }}
                        >
                          编辑
                        </Link>
                        <button
                          onClick={() =>
                            handleDeleteEvent(event.id)
                          }
                          style={{
                            background:
                              'rgba(239, 68, 68, 0.2)',
                            border:
                              '1px solid rgba(239, 68, 68, 0.3)',
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
              <h2
                style={{
                  color: 'white',
                  marginBottom: '20px',
                  fontSize: '20px'
                }}
              >
                Customers
              </h2>

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

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {filteredCustomers.length} of {customers.length}{' '}
                customers
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredCustomers.map((customer) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}
                        >
                          {customer.name}
                        </h3>
                        <p
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            marginBottom: '8px'
                          }}
                        >
                          {customer.email}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}
                        >
                          <span>👤 Age: {customer.age}</span>
                          <span>🎭 Role: {customer.role}</span>
                          <span>
                            📅 Joined:{' '}
                            {new Date(
                              customer.created_at
                            ).toLocaleDateString()}
                          </span>
                          <span>
                            ✅{customer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            background: customer.is_active
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                            color: customer.is_active
                              ? '#22c55e'
                              : '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {customer.is_active
                            ? 'Active'
                            : 'Inactive'}
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
              <h2
                style={{
                  color: 'white',
                  marginBottom: '20px',
                  fontSize: '20px'
                }}
              >
                Tickets Management
              </h2>

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {tickets.length} tickets sold
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {tickets.map((ticket) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}
                        >
                          Ticket #{' '}
                          {ticket.short_id ||
                            ticket.id.substring(0, 8)}
                        </h3>
                        <p
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px',
                            marginBottom: '8px'
                          }}
                        >
                          {ticket.holder_email || 'No email'}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}
                        >
                          <span>
                            🎫 Tier:{' '}
                            {ticket.tier || 'General'}
                          </span>
                          <span>
                            💰 Price: $
                            {ticket.price_cents
                              ? (ticket.price_cents / 100).toFixed(
                                  2
                                )
                              : 'N/A'}
                          </span>
                          <span>
                            📅 Issued:{' '}
                            {new Date(
                              ticket.issued_at ||
                                ticket.created_at
                            ).toLocaleDateString()}
                          </span>
                          <span>
                            🔗 Order:{' '}
                            {ticket.order_id
                              ? ticket.order_id.substring(0, 8) +
                                '...'
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            background:
                              ticket.status === 'used'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : ticket.status === 'unused'
                                ? 'rgba(34, 211, 238, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              ticket.status === 'used'
                                ? '#22c55e'
                                : ticket.status === 'unused'
                                ? '#22D3EE'
                                : '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {ticket.status || 'Unknown'}
                        </span>
                        {ticket.used_at && (
                          <span
                            style={{
                              fontSize: '12px',
                              color:
                                'rgba(255, 255, 255, 0.6)'
                            }}
                          >
                            Used At:{' '}
                            {new Date(
                              ticket.used_at
                            ).toLocaleString('en-US', {
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
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '8px',
                          background:
                            'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color:
                            'rgba(255, 255, 255, 0.7)',
                          wordBreak: 'break-all'
                        }}
                      >
                        QR Payload:{' '}
                        {ticket.qr_payload.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invite-codes' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <h2
                  style={{ color: 'white', fontSize: '20px' }}
                >
                  Invite Codes
                </h2>
                <button
                  onClick={generateInviteCode}
                  disabled={generatingInviteCode}
                  className="btn-partytix-gradient"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: generatingInviteCode ? 'wait' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: generatingInviteCode ? 0.6 : 1
                  }}
                >
                  {generatingInviteCode ? 'Generating...' : 'Generate New Code'}
                </button>
              </div>

              {/* Message display */}
              {inviteCodeMessage.text && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: inviteCodeMessage.type === 'success'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                    border: `1px solid ${inviteCodeMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {inviteCodeMessage.text}
                </div>
              )}

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {inviteCodes.length} invite codes available
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {inviteCodes.map((inviteCode) => (
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}
                        >
                          {inviteCode.code}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span>
                            📅 Created:{' '}
                            {new Date(
                              inviteCode.created_at
                            ).toLocaleDateString()}
                          </span>
                          <span>
                            ✅Expires:{' '}
                            {new Date(
                              inviteCode.expires_at
                            ).toLocaleDateString()}
                          </span>
                          {inviteCode.used_by ? (
                            <>
                              <span>
                                👤 Used by:{' '}
                                {inviteCode.used_by.substring(
                                  0,
                                  8
                                )}
                                ...
                              </span>
                              {inviteCode.used_at && (
                                <span>
                                  📆 Used at:{' '}
                                  {new Date(
                                    inviteCode.used_at
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>👤 Used by: Not used</span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            background: inviteCode.used_by
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(34, 211, 238, 0.2)',
                            color: inviteCode.used_by
                              ? '#22c55e'
                              : '#22D3EE',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <h2
                  style={{ color: 'white', fontSize: '20px' }}
                >
                  Activities
                </h2>
                <Link
                  href="/admin/activities/new"
                  className="btn-partytix-gradient"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  创建活动
                </Link>
              </div>

              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '20px'
                }}
              >
                {activities.length} activities
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {activities.map((activity) => (
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
                    <div
                      style={{
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'start'
                      }}
                    >
                      {activity.image_url && (
                        <div
                          style={{
                            width: '200px',
                            height: '150px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background:
                              'rgba(255, 255, 255, 0.1)'
                          }}
                        >
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
                        <h3
                          style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '12px',
                            lineHeight: '1.4'
                          }}
                        >
                          {activity.title || 'Untitled Activity'}
                        </h3>
                        <p
                          style={{
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
                          }}
                        >
                          {activity.text}
                        </p>
                        <Link
                          href={`/activity/${activity.id}`}
                          target="_blank"
                          style={{
                            display: 'inline-block',
                            color:
                              'rgba(124, 58, 237, 0.9)',
                            fontSize: '12px',
                            textDecoration: 'none',
                            marginTop: '8px'
                          }}
                        >
                          View full content →
                        </Link>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            fontSize: '12px',
                            color:
                              'rgba(255, 255, 255, 0.6)'
                          }}
                        >
                          <span>
                            📅 Created:{' '}
                            {new Date(
                              activity.created_at
                            ).toLocaleDateString()}
                          </span>
                          <span
                            style={{
                              background: activity.is_active
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                              color: activity.is_active
                                ? '#22c55e'
                                : '#ef4444',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {activity.is_active
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexDirection: 'column'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px'
                          }}
                        >
                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await fetch(
                                    `/api/admin/activities/${activity.id}/reorder`,
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type':
                                          'application/json'
                                      },
                                      body: JSON.stringify({
                                        direction: 'up'
                                      })
                                    }
                                  )
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result =
                                    await response.json()
                                  if (
                                    result.message !==
                                    'Cannot move further'
                                  ) {
                                    alert(
                                      result.message ||
                                        'Failed to move activity'
                                    )
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  'Error reordering activity:',
                                  error
                                )
                                alert('Failed to move activity')
                              }
                            }}
                            style={{
                              background:
                                'rgba(124, 58, 237, 0.2)',
                              border:
                                '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move up"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await fetch(
                                    `/api/admin/activities/${activity.id}/reorder`,
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type':
                                          'application/json'
                                      },
                                      body: JSON.stringify({
                                        direction: 'down'
                                      })
                                    }
                                  )
                                if (response.ok) {
                                  loadData()
                                } else {
                                  const result =
                                    await response.json()
                                  if (
                                    result.message !==
                                    'Cannot move further'
                                  ) {
                                    alert(
                                      result.message ||
                                        'Failed to move activity'
                                    )
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  'Error reordering activity:',
                                  error
                                )
                                alert('Failed to move activity')
                              }
                            }}
                            style={{
                              background:
                                'rgba(124, 58, 237, 0.2)',
                              border:
                                '1px solid rgba(124, 58, 237, 0.3)',
                              color: '#a78bfa',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="Move down"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                        <Link
                          href={`/admin/activities/${activity.id}/edit`}
                          style={{
                            background:
                              'rgba(34, 211, 238, 0.2)',
                            border:
                              '1px solid rgba(34, 211, 238, 0.3)',
                            color: '#22D3EE',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            textAlign: 'center'
                          }}
                        >
                          编辑
                        </Link>
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                'Are you sure you want to delete this activity?'
                              )
                            ) {
                              try {
                                const response =
                                  await fetch(
                                    `/api/admin/activities/${activity.id}`,
                                    {
                                      method: 'DELETE'
                                    }
                                  )
                                if (response.ok) {
                                  loadData()
                                } else {
                                  alert(
                                    'Failed to delete activity'
                                  )
                                }
                              } catch (error) {
                                console.error(
                                  'Error deleting activity:',
                                  error
                                )
                                alert('Failed to delete activity')
                              }
                            }
                          }}
                          style={{
                            background:
                              'rgba(239, 68, 68, 0.2)',
                            border:
                              '1px solid rgba(239, 68, 68, 0.3)',
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
    </div>
  )
}
