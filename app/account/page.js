'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarPartyTix from '../../components/NavbarPartyTix'
import { useAuth } from '../../lib/auth-context'
import { useUserTickets, useUserOrders } from '../../lib/hooks/use-api'

export default function AccountPage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const { data: tickets, loading: ticketsLoading } = useUserTickets()
  const { data: orders, loading: ordersLoading } = useUserOrders()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const loading = authLoading || ticketsLoading || ordersLoading

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
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading your account...</div>
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
              My Account
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
              Welcome back, {user?.name || 'User'}
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

        {/* User Info */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
            Account Information
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Name:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.name || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Email:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Age:</span>
              <span style={{ color: 'white', fontWeight: '500' }}>{user?.age || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Role:</span>
              <span style={{ 
                color: 'white', 
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {user?.role || 'User'}
              </span>
            </div>
          </div>
        </div>

        {/* My Tickets */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
            My Tickets ({tickets?.length || 0})
          </h2>
          
          {(tickets?.length || 0) === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'rgba(255, 255, 255, 0.6)',
              padding: '40px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No tickets yet</div>
              <div style={{ fontSize: '14px' }}>Purchase tickets for events to see them here</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {(tickets || []).map(ticket => (
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
                        {ticket.event_title || 'Event Ticket'}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        <span>🎫 Tier: {ticket.tier || 'General'}</span>
                        <span>💰 Price: ${ticket.price_cents ? (ticket.price_cents / 100).toFixed(2) : 'N/A'}</span>
                        <span>📅 Issued: {new Date(ticket.issued_at || ticket.created_at).toLocaleDateString()}</span>
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
                      QR Code: {ticket.qr_payload.substring(0, 50)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase History */}
        {(orders?.length || 0) > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>
              Purchase History ({orders?.length || 0})
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {(orders || []).map(order => (
                <div
                  key={order.id}
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
                        Order #{order.id.substring(0, 8)}
                      </h3>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                        <span>💰 Total: ${order.total_amount_cents ? (order.total_amount_cents / 100).toFixed(2) : 'N/A'}</span>
                        <span>📅 Date: {new Date(order.created_at).toLocaleDateString()}</span>
                        <span>🎫 Tickets: {order.ticket_count || 1}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        background: order.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 
                                   order.status === 'pending' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: order.status === 'completed' ? '#22c55e' : 
                               order.status === 'pending' ? '#fbbf24' : '#ef4444',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}>
                        {order.status || 'Unknown'}
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
  )
}