'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [events, setEvents] = useState([])
  const [inviteCodes, setInviteCodes] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
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
      
      // Load merchant data
      const merchantsData = JSON.parse(localStorage.getItem('merchantUsers') || '[]')
      setMerchants(merchantsData)
      
      // Load event data
      const eventsData = JSON.parse(localStorage.getItem('merchantEvents') || '[]')
      setEvents(eventsData)
      
      // Load invite codes - from API
      try {
        const response = await fetch('/api/admin/invite-codes')
        const data = await response.json()
        if (data.success) {
          setInviteCodes(data.inviteCodes || [])
        } else {
          // Fallback to local storage
          const inviteCodesData = JSON.parse(localStorage.getItem('adminInviteCodes') || '[]')
          setInviteCodes(inviteCodesData)
        }
      } catch (error) {
        console.error('Failed to load invite codes:', error)
        // Fallback to local storage
        const inviteCodesData = JSON.parse(localStorage.getItem('adminInviteCodes') || '[]')
        setInviteCodes(inviteCodesData)
      }
      
      // Load customer data - from localUsers
      const localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]')
      setCustomers(localUsers)
      
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
          maxEvents: 10,
          expiresInDays: 30
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setInviteCodes([...inviteCodes, data.inviteCode])
        // Also update local storage as backup
        const updatedCodes = [...inviteCodes, data.inviteCode]
        localStorage.setItem('adminInviteCodes', JSON.stringify(updatedCodes))
      } else {
        console.error('Failed to generate invite code:', data.error)
        alert('Failed to generate invite code, please try again')
      }
    } catch (error) {
      console.error('Generate invite code error:', error)
      // Fallback to local generation
      const code = `INV_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      const newInviteCode = {
        id: `invite_${Date.now()}`,
        code: code,
        createdBy: adminUser.id,
        createdAt: new Date().toISOString(),
        usedBy: null,
        usedAt: null,
        isActive: true,
        maxEvents: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      const updatedCodes = [...inviteCodes, newInviteCode]
      setInviteCodes(updatedCodes)
      localStorage.setItem('adminInviteCodes', JSON.stringify(updatedCodes))
    }
  }

  const updateMerchantEventLimit = (merchantId, newLimit) => {
    const updatedMerchants = merchants.map(merchant => {
      if (merchant.id === merchantId) {
        return { ...merchant, maxEvents: newLimit }
      }
      return merchant
    })
    setMerchants(updatedMerchants)
    localStorage.setItem('merchantUsers', JSON.stringify(updatedMerchants))
  }

  const toggleMerchantStatus = (merchantId) => {
    const updatedMerchants = merchants.map(merchant => {
      if (merchant.id === merchantId) {
        return { ...merchant, isActive: !merchant.isActive }
      }
      return merchant
    })
    setMerchants(updatedMerchants)
    localStorage.setItem('merchantUsers', JSON.stringify(updatedMerchants))
  }

  const updateEvent = (eventId, updatedEvent) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        return { ...event, ...updatedEvent }
      }
      return event
    })
    setEvents(updatedEvents)
    localStorage.setItem('merchantEvents', JSON.stringify(updatedEvents))
  }

  const deleteEvent = (eventId) => {
    const updatedEvents = events.filter(event => event.id !== eventId)
    setEvents(updatedEvents)
    localStorage.setItem('merchantEvents', JSON.stringify(updatedEvents))
  }

  const updateCustomer = (customerId, updatedCustomer) => {
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        return { ...customer, ...updatedCustomer }
      }
      return customer
    })
    setCustomers(updatedCustomers)
    localStorage.setItem('localUsers', JSON.stringify(updatedCustomers))
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid #f3f4f6',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '32px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#94a3b8', margin: '0' }}>
            Welcome back, {adminUser?.name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
            e.target.style.transform = 'scale(1.02)'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
            e.target.style.transform = 'scale(1)'
          }}
        >
          Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '8px',
        borderRadius: '12px',
        border: '1px solid rgba(124, 58, 237, 0.2)'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'merchants', label: 'Merchants', icon: '👥' },
          { id: 'events', label: 'Events', icon: '🎫' },
          { id: 'customers', label: 'Customers', icon: '👤' },
          { id: 'invites', label: 'Invite Codes', icon: '🔑' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.25rem' }}>Total Merchants</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px' }}>
              {merchants.length}
            </div>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Active merchants: {merchants.filter(m => m.isActive !== false).length}
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.25rem' }}>Total Events</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px' }}>
              {events.length}
            </div>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Total revenue: ${events.reduce((sum, event) => sum + (event.revenue || 0), 0) / 100}
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.25rem' }}>Total Customers</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
              {customers.length}
            </div>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Registered users
            </p>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.25rem' }}>Active Invite Codes</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>
              {inviteCodes.filter(code => code.isActive && !code.usedBy).length}
            </div>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Total generated: {inviteCodes.length}
            </p>
          </div>
        </div>
      )}

      {/* Merchants Tab */}
      {activeTab === 'merchants' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0' }}>Merchant Management</h3>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {merchants.map(merchant => (
              <div key={merchant.id} style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.125rem' }}>
                    {merchant.name}
                  </h4>
                  <p style={{ color: '#94a3b8', margin: '0 0 8px 0', fontSize: '0.875rem' }}>
                    {merchant.email}
                  </p>
                  <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                    Events: {events.filter(e => e.merchantId === merchant.id).length} / {merchant.maxEvents || '∞'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Max Events"
                    value={merchant.maxEvents || ''}
                    onChange={(e) => updateMerchantEventLimit(merchant.id, parseInt(e.target.value) || null)}
                    style={{
                      width: '100px',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button
                    onClick={() => toggleMerchantStatus(merchant.id)}
                    style={{
                      padding: '8px 16px',
                      background: merchant.isActive !== false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      border: `1px solid ${merchant.isActive !== false ? '#ef4444' : '#22c55e'}`,
                      borderRadius: '8px',
                      color: merchant.isActive !== false ? '#ef4444' : '#22c55e',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    {merchant.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0' }}>All Events</h3>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Total: {events.length} events
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {events.map(event => {
              const merchant = merchants.find(m => m.id === event.merchantId)
              return (
                <div key={event.id} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.125rem' }}>
                        {event.title}
                      </h4>
                      <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                        By: {merchant?.name || 'Unknown Merchant'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#22c55e', margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                          ${(event.revenue || 0) / 100}
                        </p>
                        <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                          Revenue
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const newTitle = prompt('Edit event title:', event.title)
                            if (newTitle && newTitle !== event.title) {
                              updateEvent(event.id, { title: newTitle })
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this event?')) {
                              deleteEvent(event.id)
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Tickets Sold</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                        {event.ticketsSold || 0} / {event.totalTickets || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Start Date</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem' }}>
                        {new Date(event.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Location</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem' }}>
                        {event.location}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0' }}>Customer Management</h3>
            <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
              Total: {customers.length} customers
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {customers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#94a3b8'
              }}>
                <p style={{ margin: '0', fontSize: '1rem' }}>No customers registered yet</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                  Customers will appear here when they register and make purchases
                </p>
              </div>
            ) : (
              customers.map(customer => (
                <div key={customer.id} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.125rem' }}>
                        {customer.name || 'Unknown Customer'}
                      </h4>
                      <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                        {customer.email || 'No email provided'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#22c55e', margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                          {customer.totalPurchases || 0}
                        </p>
                        <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                          Purchases
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const newName = prompt('Edit customer name:', customer.name || '')
                            if (newName !== null && newName !== customer.name) {
                              updateCustomer(customer.id, { name: newName })
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Customer ID</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {customer.id}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Registration Date</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem' }}>
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Total Spent</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem', fontWeight: '600' }}>
                        ${(customer.totalSpent || 0) / 100}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invite Codes Tab */}
      {activeTab === 'invites' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0' }}>Invite Code Management</h3>
            <button
              onClick={generateInviteCode}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              Generate New Code
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {inviteCodes.map(code => (
              <div key={code.id} style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.125rem' }}>
                      {code.code}
                    </h4>
                    <p style={{ color: '#94a3b8', margin: '0', fontSize: '0.875rem' }}>
                      Created: {new Date(code.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: code.usedBy ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: code.usedBy ? '#22c55e' : '#3b82f6',
                      border: `1px solid ${code.usedBy ? '#22c55e' : '#3b82f6'}`
                    }}>
                      {code.usedBy ? 'Used' : 'Active'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div>
                    <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Max Events</p>
                    <p style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                      {code.maxEvents || '∞'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Expires</p>
                    <p style={{ color: 'white', margin: '0', fontSize: '0.875rem' }}>
                      {new Date(code.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {code.usedBy && (
                    <div>
                      <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Used By</p>
                      <p style={{ color: 'white', margin: '0', fontSize: '0.875rem' }}>
                        {code.usedBy}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}