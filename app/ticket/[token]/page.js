'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import NavbarPartyTix from '@/components/NavbarPartyTix'
import { getTicketKindDisplayName } from '@/lib/ticket-helpers'

export default function TicketInfoPage() {
  const params = useParams()
  const token = params?.token
  const [ticket, setTicket] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid ticket token')
      setLoading(false)
      return
    }

    const fetchTicketInfo = async () => {
      try {
        setLoading(true)
        
        // Try to parse token as short_id or QR payload
        // First, try to get ticket by short_id
        const response = await fetch(`/api/tickets/info?token=${encodeURIComponent(token)}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setTicket(result.data.ticket)
          setEvent(result.data.event)
        } else {
          setError(result.message || 'Ticket not found')
        }
      } catch (err) {
        console.error('Error fetching ticket info:', err)
        setError('Failed to load ticket information')
      } finally {
        setLoading(false)
      }
    }

    fetchTicketInfo()
  }, [token])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
      }}>
        <NavbarPartyTix />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
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
            width: '100%'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading ticket information...</div>
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

  if (error || !ticket) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)'
      }}>
        <NavbarPartyTix />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
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
            width: '100%'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '20px', marginBottom: '8px', fontWeight: '600' }}>
              {error || 'Ticket not found'}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '16px' }}>
              The ticket you're looking for doesn't exist or the link is invalid.
            </div>
          </div>
        </div>
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
        maxWidth: '800px',
        margin: '0 auto',
        padding: '100px 24px 40px 24px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Ticket Information
          </h1>
          
          <div style={{
            marginTop: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Event Info */}
            {event && (
              <div style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h2 style={{
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  Event
                </h2>
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  fontSize: '14px'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Title:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>{event.title || 'N/A'}</span>
                  </div>
                  {event.start_at && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Date:</span>{' '}
                      <span style={{ color: 'white', fontWeight: '500' }}>
                        {new Date(event.start_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {event.venue_name && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Venue:</span>{' '}
                      <span style={{ color: 'white', fontWeight: '500' }}>{event.venue_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Info */}
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                Ticket Details
              </h2>
              <div style={{
                display: 'grid',
                gap: '12px',
                fontSize: '14px'
              }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Ticket ID:</span>{' '}
                  <span style={{ color: 'white', fontWeight: '500', fontFamily: 'monospace' }}>
                    {ticket.short_id || ticket.id.substring(0, 8)}
                  </span>
                </div>
                
                {ticket.ticket_kind && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Type:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>
                      {getTicketKindDisplayName(ticket.ticket_kind)}
                    </span>
                  </div>
                )}
                
                {ticket.tier && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Tier:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>{ticket.tier}</span>
                  </div>
                )}
                
                <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Status:</span>{' '}
                  <span style={{
                    color: ticket.used || ticket.status === 'used' ? '#22c55e' : '#22D3EE',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {ticket.used || ticket.status === 'used' ? 'Used' : 'Unused'}
                  </span>
                </div>
                
                {ticket.used_at && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Used At:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>
                      {new Date(ticket.used_at).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {ticket.holder_name && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Holder:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>{ticket.holder_name}</span>
                  </div>
                )}
                
                {ticket.created_at && (
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Issued:</span>{' '}
                    <span style={{ color: 'white', fontWeight: '500' }}>
                      {new Date(ticket.created_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div style={{
              padding: '16px',
              background: 'rgba(124, 58, 237, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center'
            }}>
              <strong style={{ color: 'white' }}>Note:</strong> This QR code is for information purposes only. 
              To use your ticket, go to your account page and click the "Use Ticket" button.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

