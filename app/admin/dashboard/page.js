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
              <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>Events</h2>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {events.length} events created
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
  )
}