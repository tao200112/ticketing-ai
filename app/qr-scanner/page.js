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
  const scanIntervalRef = useRef(null)
  const [permissionStatus, setPermissionStatus] = useState(null)

  useEffect(() => {
    // Check permission status on mount
    checkPermissionStatus()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [stream])

  // Monitor permission changes
  useEffect(() => {
    if (permissionStatus === 'granted' && error.includes('Unable to access camera')) {
      // Permission was granted, clear error and try again
      setError('')
      setTimeout(() => {
        startScanning()
      }, 500)
    }
  }, [permissionStatus])

  const checkPermissionStatus = async () => {
    try {
      // Use Permissions API if available
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' })
          setPermissionStatus(result.state)
          console.log('Camera permission status:', result.state)
          
          // Listen for permission changes
          result.onchange = () => {
            console.log('Permission status changed:', result.state)
            setPermissionStatus(result.state)
          }
        } catch (permErr) {
          // Some browsers might not support camera permission query
          console.debug('Camera permission query not supported:', permErr)
        }
      } else {
        console.debug('Permissions API not available')
      }
    } catch (err) {
      // Permissions API might not be fully supported, ignore
      console.debug('Permission API not available:', err)
    }
  }

  // Auto-scan when camera is active
  useEffect(() => {
    if (isScanning && videoRef.current && canvasRef.current) {
      // Start auto-scanning every 500ms
      const scanLoop = () => {
        if (!videoRef.current || !canvasRef.current || !isScanning) return
        
        try {
          const video = videoRef.current
          const canvas = canvasRef.current
          
          // Check if video is ready
          if (video.readyState !== video.HAVE_ENOUGH_DATA) return
          
          const context = canvas.getContext('2d')

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Use jsQR to scan QR code
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code && code.data) {
            // Found a QR code, stop scanning and verify
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            setScannedCode(code.data)
            verifyTicketFromQR(code.data)
          }
        } catch (err) {
          // Silently ignore frame capture errors during auto-scan
          console.debug('Frame capture error:', err)
        }
      }

      scanIntervalRef.current = setInterval(scanLoop, 500)
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [isScanning])

  const startScanning = async () => {
    try {
      setError('')
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser. Please use a modern browser on a mobile device.')
        return
      }

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost'
      if (!isSecureContext) {
        setError(`Camera access requires HTTPS connection. Current protocol: ${location.protocol}, hostname: ${location.hostname}`)
        return
      }
      
      // Log environment info for debugging
      console.log('Environment info:', {
        protocol: location.protocol,
        hostname: location.hostname,
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent
      })

      // Request camera permission with better error handling for mobile
      let constraints = {
        video: {
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          
          // Wait for video to be ready before playing
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err => {
              console.error('Video play error:', err)
            })
          }
        }
        
        setIsScanning(true)
      } catch (permissionError) {
        // Update permission status
        await checkPermissionStatus()
        
        // Log detailed error for debugging
        console.error('Detailed camera error:', {
          name: permissionError.name,
          message: permissionError.message,
          stack: permissionError.stack,
          permissionStatus: permissionStatus,
          isSecureContext: window.isSecureContext,
          protocol: location.protocol,
          hostname: location.hostname
        })
        
        // Handle specific permission errors
        let errorMessage = 'Unable to access camera. '
        
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          // Check if permission was actually denied or just not granted yet
          if (permissionStatus === 'prompt') {
            errorMessage += 'Please allow camera access when prompted. If you already granted permission, try refreshing the page.'
          } else {
            errorMessage += 'Camera permission was denied. Please enable it in your browser settings. On mobile: Settings > Browser > Camera permissions, then refresh this page.'
          }
        } else if (permissionError.name === 'NotFoundError' || permissionError.name === 'DevicesNotFoundError') {
          errorMessage += 'No camera found. Please ensure your device has a camera.'
        } else if (permissionError.name === 'NotReadableError' || permissionError.name === 'TrackStartError') {
          errorMessage += 'Camera is already in use by another app. Please close other apps using the camera.'
        } else if (permissionError.name === 'OverconstrainedError' || permissionError.name === 'ConstraintNotSatisfiedError') {
          errorMessage += 'Camera settings not supported. Trying with default settings...'
          
          // Fallback to simpler constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
            setStream(fallbackStream)
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream
              videoRef.current.onloadedmetadata = () => {
                videoRef.current.play().catch(err => console.error('Video play error:', err))
              }
            }
            setIsScanning(true)
            setError('') // Clear error on success
            return
          } catch (fallbackError) {
            errorMessage = 'Unable to access camera with any settings. Please check your device permissions.'
          }
        } else {
          errorMessage += `Error: ${permissionError.message || permissionError.name || 'Unknown error'}`
        }
        
        setError(errorMessage)
        console.error('Camera access error:', permissionError)
        console.error('Permission status:', permissionStatus)
      }
    } catch (err) {
      setError('Unexpected error while accessing camera. Please try again or use manual input.')
      console.error('Unexpected camera error:', err)
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
    if (!videoRef.current || !canvasRef.current || !isScanning) return
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      // Check if video is ready
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return
      
      const context = canvas.getContext('2d')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Use jsQR to scan QR code
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data) {
        // Found a QR code, stop scanning and verify
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
        setScannedCode(code.data)
        verifyTicketFromQR(code.data)
      }
    } catch (err) {
      // Silently ignore frame capture errors during auto-scan
      console.debug('Frame capture error:', err)
    }
  }

  const handleManualInput = (e) => {
    setScannedCode(e.target.value)
  }

  const verifyTicketFromQR = async (qrData, redeem = false) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qr_payload: qrData,
          redeem: redeem 
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        try {
          const { ticket, event, validity } = result.data
          
          // Safely extract validity fields
          const validFrom = validity?.validFrom || validity?.valid_from || ticket?.validity_start_time || event?.start_at || null
          const validUntil = validity?.validUntil || validity?.valid_until || ticket?.validity_end_time || validity?.eventEnd || event?.end_at || null
          
          // Handle redemption success - show success message
          if (redeem && ticket.status === 'used') {
            setScanResult({
              ticket_id: ticket.short_id || ticket.id,
              ticket_tier: ticket.tier || 'N/A',
              holder_name: ticket.holder_name || 'Unknown',
              holder_age: ticket.holder_age || null,
              event_name: event?.title || 'Unknown Event',
              event_venue: event?.venue_name || 'N/A',
              validity_status: 'redeemed',
              validity_message: '✅ Ticket redeemed successfully',
              valid_from: validFrom,
              valid_until: validUntil,
              verification_count: ticket.verification_count || 1,
              scanned_at: result.data.scanned_at || new Date().toISOString(),
              redeemed: true,
              ticket_status: 'used',
              used_at: ticket.used_at || null
            })
            
            setError('')
            stopScanning()
          } else {
            // Normal verification result
            // Determine validity status: invalid if ticket is used, expired, or validity check failed
            let validityStatus = 'valid'
            if (!validity?.valid || ticket.status === 'used' || ticket.status === 'refunded' || ticket.status === 'cancelled') {
              validityStatus = 'invalid'
            }
            
            setScanResult({
              ticket_id: ticket.short_id || ticket.id,
              ticket_tier: ticket.tier || 'N/A',
              holder_name: ticket.holder_name || 'Unknown',
              holder_age: ticket.holder_age || null,
              event_name: event?.title || 'Unknown Event',
              event_venue: event?.venue_name || 'N/A',
              validity_status: validityStatus,
              validity_message: validity?.message || 'Ticket verification completed',
              valid_from: validFrom,
              valid_until: validUntil,
              verification_count: ticket.verification_count || 1,
              scanned_at: result.data.scanned_at || new Date().toISOString(),
              redeemed: redeem || false,
              ticket_status: ticket.status || 'unknown',
              used_at: ticket.used_at || null
            })
            
            setError('')
            stopScanning()
          }
        } catch (parseError) {
          // If parsing response data fails, log but don't show error if redeem succeeded
          console.error('Error parsing response data:', parseError)
          if (redeem) {
            // If redeem was requested, assume success if we got a 200 response
            setError('Redemption successful, but page update failed. Please refresh to check status.')
          } else {
            setError('Error processing verification result, please try again')
          }
        }
      } else {
        // Check for specific error codes
        const errorCode = result.error || result.code
        let errorMessage = result.message || result.error || 'Ticket verification failed'
        
        // Show Chinese message for "not your merchant ticket" error
        if (errorCode === 'NOT_YOUR_MERCHANT_TICKET' || errorMessage.includes('not your merchant')) {
          errorMessage = 'This ticket does not belong to your merchant'
        }
        
        setError(errorMessage)
        setScanResult(null)
      }
    } catch (err) {
      // Don't show error if redemption was successful but there was a UI update issue
      if (redeem && !err.message?.includes('REDEEM_FAILED')) {
        // Check if ticket was actually redeemed by checking current state
        console.warn('Post-redemption UI update issue (non-critical):', err)
      } else {
        setError(err.message || 'Ticket verification error, please try again')
      }
      console.error('Verification error:', err)
      // Don't clear scanResult if it was already set and redemption succeeded
      if (!redeem || !scanResult) {
        setScanResult(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const redeemTicket = async () => {
    if (!scannedCode) {
      setError('Please scan a ticket first')
      return
    }
    
    await verifyTicketFromQR(scannedCode, true)
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
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <svg style={{ width: '1.25rem', height: '1.25rem', color: '#fca5a5', flexShrink: 0, marginTop: '0.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fca5a5', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Camera Access Error
                </div>
                <div style={{ color: '#fca5a5', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                  {error}
                </div>
                
                {/* Retry button */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setError('')
                      checkPermissionStatus()
                      setTimeout(() => startScanning(), 300)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#6d28d9'
                      e.target.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#7c3aed'
                      e.target.style.transform = 'scale(1)'
                    }}
                  >
                    🔄 Retry Camera Access
                  </button>
                </div>
                
                <div style={{ color: '#fca5a5', fontSize: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <strong>If permission is already granted:</strong><br />
                  1. Make sure you're on HTTPS (not HTTP)<br />
                  2. Try refreshing this page (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)<br />
                  3. Close and reopen the browser tab<br />
                  4. Check if other apps are using the camera<br />
                  5. Try accessing production URL instead of preview URL<br />
                  <br />
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem' }}>
                    <strong>Debug Info:</strong><br />
                    Protocol: {location.protocol}<br />
                    Hostname: {location.hostname}<br />
                    Secure Context: {window.isSecureContext ? 'Yes' : 'No'}<br />
                    Permission Status: {permissionStatus || 'Unknown'}
                  </div>
                  <br />
                  <strong>Or use manual input:</strong> Enter the ticket code below instead.
                </div>
              </div>
            </div>
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
              backgroundColor: scanResult.validity_status === 'valid' || scanResult.validity_status === 'redeemed' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : scanResult.validity_status === 'redeemed'
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${
                scanResult.validity_status === 'redeemed' ? '#3b82f6' :
                scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444'
              }`,
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: scanResult.validity_status === 'redeemed' ? '#3b82f6' :
                    scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444'
                }}></div>
                <span style={{
                  color: scanResult.validity_status === 'redeemed' ? '#3b82f6' :
                    scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {scanResult.validity_status === 'redeemed' ? '✅ Ticket Redeemed' :
                   scanResult.validity_status === 'valid' ? '✓ Ticket Valid' : 
                   '✗ Ticket Invalid'}
                </span>
              </div>
              {scanResult.validity_message && (
                <div style={{
                  color: scanResult.validity_status === 'redeemed' ? '#3b82f6' :
                    scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  marginBottom: scanResult.validity_status === 'valid' && !scanResult.redeemed ? '1rem' : '0.5rem'
                }}>
                  {scanResult.validity_message}
                </div>
              )}
              
              {/* Redeem button - only show if ticket is valid and not redeemed */}
              {scanResult.validity_status === 'valid' && !scanResult.redeemed && scanResult.ticket_status !== 'used' && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <button
                    onClick={redeemTicket}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      opacity: loading ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'scale(1.02)'
                        e.target.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {loading ? 'Redeeming...' : 'Redeem Ticket'}
                  </button>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
                    After redemption, the ticket will be marked as used and cannot be used again
                  </p>
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
