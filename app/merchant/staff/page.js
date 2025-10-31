'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'
import jsQR from 'jsqr'

export default function MerchantStaffPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const scanIntervalRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // 检查商家登录状态
    const checkMerchantAuth = () => {
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      const parsedUser = JSON.parse(user)
      // 所有商家用户都可以访问Staff页面，不需要区分角色
      setUserRole('boss') // 设置为boss，但仅用于导航栏显示
    }
    
    checkMerchantAuth()
    
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
        
        // Wait for video metadata to load before playing
        await new Promise((resolve, reject) => {
          const video = videoRef.current
          if (!video) {
            reject(new Error('Video element not found'))
            return
          }
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve()
          }
          
          const onError = () => {
            video.removeEventListener('error', onError)
            reject(new Error('Video failed to load'))
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          // Set a timeout
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video load timeout'))
          }, 5000)
        })
        
        await videoRef.current.play()
        setIsScanning(true)
        
        // Start QR detection after video is playing
        setTimeout(() => {
          startQRDetection()
        }, 100)
      } else {
        setError('Video element not initialized')
      }
    } catch (err) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permission and try again.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera device.')
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.')
      } else {
        setError(`Unable to access camera: ${err.message || 'Unknown error'}`)
      }
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
      scanIntervalRef.current = null
    }

    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available')
      setError('Camera initialization failed. Please try again.')
      return
    }

    scanIntervalRef.current = setInterval(() => {
      try {
        if (!videoRef.current || !canvasRef.current || !isScanning) {
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
          }
          return
        }

        const video = videoRef.current
        const canvas = canvasRef.current

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          return
        }

        const context = canvas.getContext('2d')
        
        // Set canvas size to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          setScannedCode(code.data)
          stopScanning()
          verifyTicket(code.data)
        }
      } catch (err) {
        console.error('QR detection error:', err)
        // Don't stop scanning on detection errors, just log them
      }
    }, 200) // Scan every 200ms for better performance
  }

  const verifyTicket = async (qrData) => {
    try {
      setLoading(true)
      setError('')
      
      const merchantUserStr = localStorage.getItem('merchantUser')
      if (!merchantUserStr) {
        setError('Please login first')
        return
      }
      
      const merchantUser = JSON.parse(merchantUserStr)
      const userId = merchantUser.id
      
      const response = await fetch('/api/merchant/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_payload: qrData,
          user_id: userId
        }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        // Use the verify API to get detailed ticket information
        const verifyResponse = await fetch('/api/tickets/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            qr_payload: qrData,
            redeem: false
          }),
        })
        
        const verifyResult = await verifyResponse.json()
        
        if (verifyResponse.ok && verifyResult.success) {
          const { ticket, event, validity } = verifyResult.data
          
          // Determine validity status
          let validityStatus = 'valid'
          let validityMessage = validity?.message || 'Ticket verification completed'
          
          if (!validity?.valid || ticket.status === 'used' || ticket.status === 'refunded' || ticket.status === 'cancelled') {
            validityStatus = 'invalid'
            // Update message to be more specific
            if (ticket.status === 'used') {
              validityMessage = 'Ticket has already been redeemed'
            } else if (validity?.status === 'expired') {
              validityMessage = 'Ticket has expired'
            } else if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
              validityMessage = 'Ticket has been cancelled or refunded'
            }
          }
          
          setScanResult({
            ticket_id: ticket.short_id || ticket.id,
            status: ticket.status,
            redeemed_at: ticket.used_at || result.data.redeemed_at,
            validity_status: validityStatus,
            validity_message: validityMessage,
            success: true
          })
        } else {
          // Fallback to original result if verify API fails
          setScanResult({
            ticket_id: result.data.ticket_id,
            status: result.data.status,
            redeemed_at: result.data.redeemed_at,
            success: true
          })
        }
        setError('')
      } else {
        const errorCode = result.error || result.code
        let errorMessage = result.message || 'Ticket verification failed'
        
        if (errorCode === 'NOT_YOUR_MERCHANT_TICKET' || errorMessage.includes('Not your merchant')) {
          errorMessage = 'This ticket does not belong to your merchant'
        }
        
        setError(errorMessage)
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
      <MerchantNavbar userRole={userRole} />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Staff Ticket Scanner
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
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
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
                  marginBottom: '16px',
                  display: 'block'
                }}
                playsInline
                autoPlay
                muted
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
              />
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
              Redemption Result
            </h2>
            
            <div style={{
              backgroundColor: scanResult.validity_status === 'invalid' 
                ? 'rgba(239, 68, 68, 0.1)' 
                : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${scanResult.validity_status === 'invalid' ? '#ef4444' : '#10b981'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                color: scanResult.validity_status === 'invalid' ? '#ef4444' : '#10b981',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                {scanResult.validity_status === 'invalid' ? '✗ Ticket Invalid' : '✓ Ticket Redeemed Successfully'}
              </div>
              {scanResult.validity_message && (
                <div style={{ 
                  color: scanResult.validity_status === 'invalid' ? '#ef4444' : '#94a3b8', 
                  fontSize: '0.875rem',
                  marginBottom: '8px'
                }}>
                  {scanResult.validity_message}
                </div>
              )}
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Ticket ID: {scanResult.ticket_id}
              </div>
              {scanResult.redeemed_at && (
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Redeemed At: {new Date(scanResult.redeemed_at).toLocaleString()}
                </div>
              )}
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
              Continue Scanning
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

