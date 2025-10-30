'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'

export default function QRScannerPage() {
  const router = useRouter()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startScanning = async () => {
    try {
      setError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      
      setIsScanning(true)
    } catch (err) {
      setError('Unable to access camera, please check permissions')
      console.error('Camera access error:', err)
    }
  }

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsScanning(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Use jsQR to scan QR code
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      setScannedCode(code.data)
      verifyTicketFromQR(code.data)
    } else {
      setError('No QR code detected, please ensure QR code is clearly visible')
    }
  }

  const handleManualInput = (e) => {
    setScannedCode(e.target.value)
  }

  const verifyTicketFromQR = async (qrData) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_payload: qrData }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const { ticket, event, validity } = result.data
        
        setScanResult({
          ticket_id: ticket.short_id || ticket.id,
          ticket_tier: ticket.tier,
          holder_name: ticket.holder_name || 'Unknown',
          holder_age: ticket.holder_age,
          event_name: event?.title || 'Unknown Event',
          event_venue: event?.venue_name || 'N/A',
          validity_status: validity.valid ? 'valid' : 'invalid',
          validity_message: validity.message,
          valid_from: validity.validFrom || event?.start_at,
          valid_until: validity.validUntil || event?.end_at,
          verification_count: ticket.verification_count || 1,
          scanned_at: new Date().toISOString()
        })
        
        setError('')
        stopScanning()
      } else {
        setError(result.message || 'Ticket verification failed')
        setScanResult(null)
      }
    } catch (err) {
      setError('Ticket verification error, please try again')
      console.error('Verification error:', err)
    } finally {
      setLoading(false)
    }
  }

  const verifyTicket = async () => {
    if (!scannedCode) {
      setError('Please enter or scan a ticket code')
      return
    }

    await verifyTicketFromQR(scannedCode)
  }

  const resetScanner = () => {
    setScannedCode('')
    setScanResult(null)
    setError('')
    stopScanning()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                color: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              margin: 0
            }}>
              QR Ticket Scanner
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            Scan QR code or manually enter ticket code for verification
          </p>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto'
            }}></div>
            <p style={{ color: 'white' }}>Verifying ticket...</p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Scanning area */}
        {!scanResult && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1.5rem'
            }}>
              Scan QR Code
            </h2>

            {/* Camera preview */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
              margin: '0 auto 1.5rem auto',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#1f2937'
            }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover',
                  display: isScanning ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
              {!isScanning && (
                <div style={{
                  width: '100%',
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '1rem'
                }}>
                  Click to start scanning
                </div>
              )}
            </div>

            {/* Scanning control buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Start Scanning
                </button>
              ) : (
                <>
                  <button
                    onClick={captureFrame}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.02)'
                      e.target.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    Scan Current Frame
                  </button>
                  <button
                    onClick={stopScanning}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(239, 68, 68, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(239, 68, 68, 1)'
                      e.target.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'
                      e.target.style.transform = 'scale(1)'
                    }}
                  >
                    Stop Scanning
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Manual input area */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            Manual Input
          </h2>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={scannedCode}
              onChange={handleManualInput}
              placeholder="Enter ticket code or scan QR code"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              onClick={verifyTicket}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              Verify
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        {/* Scan result */}
        {scanResult && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'white',
                margin: 0
              }}>
                Verification Result
              </h2>
              <button
                onClick={resetScanner}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(55, 65, 81, 0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.7)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
              >
                Scan Again
              </button>
            </div>

            {/* Validity status */}
            <div style={{
              backgroundColor: scanResult.validity_status === 'valid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444'}`,
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444'
                }}></div>
                <span style={{
                  color: scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {scanResult.validity_status === 'valid' ? 'Ticket Valid' : 'Ticket Invalid'}
                </span>
              </div>
              {scanResult.validity_message && (
                <div style={{
                  color: scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>
                  {scanResult.validity_message}
                </div>
              )}
            </div>

            {/* Ticket details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Ticket ID</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.ticket_id}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Event Name</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.event_name}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Holder Name</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.holder_name}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Holder Age</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.holder_age || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Ticket Tier</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.ticket_tier}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Venue</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.event_venue}</div>
              </div>
              {scanResult.valid_from && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Valid From</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>
                    {new Date(scanResult.valid_from).toLocaleString('en-US')}
                  </div>
                </div>
              )}
              {scanResult.valid_until && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Valid Until</div>
                  <div style={{ color: 'white', fontWeight: '500' }}>
                    {new Date(scanResult.valid_until).toLocaleString('en-US')}
                  </div>
                </div>
              )}
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Verification Count</div>
                <div style={{ color: 'white', fontWeight: '500' }}>{scanResult.verification_count}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Scanned At</div>
                <div style={{ color: 'white', fontWeight: '500' }}>
                  {new Date(scanResult.scanned_at).toLocaleString('en-US')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
