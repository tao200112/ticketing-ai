'use client'

import { useState, useEffect } from 'react'

export default function InviteCodesPage() {
  const [inviteCodes, setInviteCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInviteCodes()
  }, [])

  const fetchInviteCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/invite-codes')
      const data = await response.json()
      
      if (data.success) {
        setInviteCodes(data.inviteCodes || [])
      } else {
        setError(data.error || 'Failed to fetch invite codes')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateNewCode = async () => {
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxEvents: 10,
          expiresInDays: 30
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh invite codes list
        await fetchInviteCodes()
        alert('Invite code generated successfully!')
      } else {
        alert('Generation failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error generating invite code: ' + err.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
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
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            Merchant Invite Code Management
          </h1>
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#94a3b8',
            margin: 0 
          }}>
            Manage merchant registration invite codes and control platform access
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={generateNewCode}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            ➕ Generate New Invite Code
          </button>
          
          <button
            onClick={fetchInviteCodes}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            🔄 Refresh List
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#dc2626'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Invite Codes List */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '1.5rem' 
          }}>
            Invite Code List ({inviteCodes.length})
          </h2>

          {inviteCodes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#94a3b8'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <div style={{ fontSize: '1.125rem' }}>No invite codes yet</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Click the button above to generate your first invite code
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {inviteCodes.map((code, index) => (
                <div
                  key={code.id || index}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        backgroundColor: code.is_active ? '#10b981' : '#6b7280',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {code.is_active ? '✅ Active' : '❌ Disabled'}
                      </div>
                      
                      {isExpired(code.expires_at) && (
                        <div style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          ⏰ Expired
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: 'white',
                      fontFamily: 'monospace',
                      marginBottom: '0.5rem'
                    }}>
                      {code.code}
                    </div>
                    
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div>Max Events: {code.max_events || 'Unlimited'}</div>
                      <div>Created At: {formatDate(code.created_at)}</div>
                      <div>Expires At: {formatDate(code.expires_at) || 'Never'}</div>
                      <div>Created By: {code.created_by || 'Unknown'}</div>
                      {code.used_by && (
                        <div>Used By: {code.used_by}</div>
                      )}
                      {code.used_at && (
                        <div>Used At: {formatDate(code.used_at)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'flex-end'
                  }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(code.code)
                        alert('Invite code copied to clipboard!')
                      }}
                      style={{
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}









