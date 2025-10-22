'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminScanTicket() {
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = async () => {
    if (!ticketId.trim()) {
      alert('Please enter a ticket ID to scan.');
      return;
    }

    setIsLoading(true);
    setScanResult(null);

    try {
      // 使用新的票据验证 API
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_payload: ticketId.trim()
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setScanResult({
          valid: true,
          ticket: data.ticket,
          message: data.message
        });
      } else {
        setScanResult({
          valid: false,
          message: data.message || 'Ticket verification failed'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult({
        valid: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetScan = () => {
    setTicketId('');
    setScanResult(null);
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* 头部导航 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e9ecef'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#333',
            margin: '0 0 0.5rem 0'
          }}>
            Ticket Scanner
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Scan and verify tickets using QR codes
          </p>
        </div>
        <Link href="/admin/dashboard" style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6c757d',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* 扫描界面 */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#333'
        }}>
          Scan Ticket
        </h2>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#333'
          }}>
            QR Code Data or Ticket ID
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none',
              marginBottom: '1rem'
            }}
            placeholder="Enter QR code data or ticket ID"
            onKeyPress={(e) => e.key === 'Enter' && handleScan()}
          />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleScan}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isLoading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              {isLoading ? 'Scanning...' : 'Scan Ticket'}
            </button>
            
            <button
              onClick={resetScan}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 扫描结果 */}
      {scanResult && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem',
          border: '1px solid #e9ecef'
        }}>
          {scanResult.valid ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  ✅
                </div>
                <h2 style={{
                  color: '#28a745',
                  margin: 0,
                  fontSize: '1.5rem'
                }}>
                  Valid Ticket
                </h2>
              </div>
              
              <div style={{
                backgroundColor: '#d4edda',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>Ticket Details</h3>
                <div style={{ color: '#155724', fontSize: '0.9rem' }}>
                  <p><strong>ID:</strong> {scanResult.ticket?.shortId}</p>
                  <p><strong>Event:</strong> {scanResult.ticket?.eventId}</p>
                  <p><strong>Tier:</strong> {scanResult.ticket?.tier}</p>
                  <p><strong>Email:</strong> {scanResult.ticket?.holderEmail}</p>
                  <p><strong>Status:</strong> {scanResult.ticket?.status}</p>
                  <p><strong>Issued:</strong> {new Date(scanResult.ticket?.issuedAt).toLocaleString()}</p>
                  {scanResult.ticket?.usedAt && (
                    <p><strong>Used:</strong> {new Date(scanResult.ticket.usedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '1rem',
                borderRadius: '8px',
                color: '#856404',
                fontSize: '0.9rem'
              }}>
                <strong>Entry Status:</strong> {scanResult.message}
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  ❌
                </div>
                <h2 style={{
                  color: '#dc3545',
                  margin: 0,
                  fontSize: '1.5rem'
                }}>
                  Invalid Ticket
                </h2>
              </div>
              
              <div style={{
                backgroundColor: '#f8d7da',
                padding: '1rem',
                borderRadius: '8px',
                color: '#721c24'
              }}>
                <strong>Error:</strong> {scanResult.message}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Scanner Instructions</h3>
        <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li>Enter the QR code data or ticket ID manually</li>
          <li>Valid tickets will show customer details and entry confirmation</li>
          <li>Invalid tickets will be rejected with an error message</li>
          <li>All ticket data is verified against the database</li>
          <li>First scan marks the ticket as used, subsequent scans will show "already used"</li>
        </ul>
      </div>
    </div>
  );
}
