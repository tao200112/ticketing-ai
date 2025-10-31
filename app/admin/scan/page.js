'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'
import jsQR from 'jsqr'

export default function AdminScanPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState(null)
  const scanIntervalRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Check admin login status
    const checkAdminAuth = () => {
      const token = localStorage.getItem('adminToken')
      const user = localStorage.getItem('adminUser')
      
      if (!token || !user) {
        router.push('/admin')
        return
      }
    }
    
    checkAdminAuth()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [router, stream])

  const startScanning = async () => {
    try {
      setError('')
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScanning(true)
        startQRDetection()
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.')
      console.error('Camera error:', err)
    }
  }

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startQRDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code) {
            setScannedCode(code.data)
            stopScanning()
            verifyTicket(code.data)
          }
        }
      }
    }, 100)
  }

  const verifyTicket = async (qrData) => {
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
          redeem: false 
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const { ticket, event, validity } = result.data
        setScanResult({
          ticket_id: ticket.short_id || ticket.id,
          ticket_tier: ticket.tier || 'N/A',
          holder_name: ticket.holder_name || 'Unknown',
          event_name: event?.title || 'Unknown Event',
          validity_status: validity.valid ? 'valid' : 'invalid',
          validity_message: validity.message || 'Ticket verification completed'
        })
      } else {
        setError(result.message || result.error || 'Ticket verification failed')
        setScanResult(null)
      }
    } catch (err) {
      setError(err.message || 'Ticket verification error, please try again')
      console.error('Verification error:', err)
      setScanResult(null)
    } finally {
      setLoading(false)
    }
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
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      paddingTop: '80px'
    }}>
      <AdminNavbar />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Admin Ticket Scanner
        </h1>

        {/* Scanner Area */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          {!isScanning ? (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={startScanning}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                Start Scanning
              </button>
            </div>
          ) : (
            <div>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
                playsInline
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button
                onClick={stopScanning}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Stop Scanning
              </button>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>
              Verification Result
            </h2>
            
            <div style={{
              backgroundColor: scanResult.validity_status === 'valid' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                color: scanResult.validity_status === 'valid' ? '#10b981' : '#ef4444',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                {scanResult.validity_status === 'valid' ? '✓ Valid Ticket' : '✗ Invalid Ticket'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                {scanResult.validity_message}
              </div>
            </div>

            <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '8px' }}>
              <strong>Ticket ID:</strong> {scanResult.ticket_id}
            </div>
            <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '8px' }}>
              <strong>Tier:</strong> {scanResult.ticket_tier}
            </div>
            <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '8px' }}>
              <strong>Holder:</strong> {scanResult.holder_name}
            </div>
            <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '16px' }}>
              <strong>Event:</strong> {scanResult.event_name}
            </div>

            <button
              onClick={resetScanner}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(55, 65, 81, 0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Scan Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
