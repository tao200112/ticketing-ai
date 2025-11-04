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
  const [debugInfo, setDebugInfo] = useState([])
  const [showDebug, setShowDebug] = useState(true) // 默认显示调试面板
  const [scanAttempts, setScanAttempts] = useState(0)
  
  // 添加调试日志函数（同时显示在UI和控制台）
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    console.log(`[${timestamp}] ${message}`)
    setDebugInfo(prev => [...prev.slice(-19), logEntry]) // 保留最近20条
  }
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
    let mediaStream = null
    try {
      setError('')
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser')
        return
      }

      // First, set scanning state to true so video element renders
      setIsScanning(true)
      
      // Wait a moment for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now get camera stream
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setStream(mediaStream)
      
      // Wait for video element to be available (retry logic)
      let attempts = 0
      const maxAttempts = 20 // Increase attempts to 2 seconds
      while (!videoRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (!videoRef.current) {
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop())
        }
        setStream(null)
        setIsScanning(false)
        setDebugInfo('')
        setError('Video element not initialized. Please refresh the page and try again.')
        return
      }
      
      const video = videoRef.current
      video.srcObject = mediaStream
      
      // Wait for video metadata to load before playing
      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          clearTimeout(timeoutId)
          resolve()
        }
        
        const onError = (err) => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          clearTimeout(timeoutId)
          reject(new Error('Video failed to load'))
        }
        
        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('error', onError)
        
        // Set a timeout
        const timeoutId = setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          reject(new Error('Video load timeout'))
        }, 5000)
      })
      
      try {
        await video.play()
      } catch (playError) {
        console.error('Video play error:', playError)
        // Try again with user interaction
        throw new Error('Video playback failed. Please click Start Scanning again.')
      }
      
      // QR detection will start automatically via useEffect when isScanning is true
      console.log('Video started, QR detection should begin automatically')
      addDebugLog('✅ Video started, QR detection will begin automatically', 'success')
    } catch (err) {
      console.error('Camera error:', err)
      
      // Clean up on error
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      setStream(null)
      setIsScanning(false)
      addDebugLog(`❌ Failed to start camera: ${err.message || 'Unknown error'}`, 'error')
      
      // Set specific error messages
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

  // Auto-scan QR codes when camera is active
  useEffect(() => {
    // Only run when scanning is active
    if (!isScanning) {
      // Clean up when not scanning
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      return
    }
    
    // Wait for refs to be available
    const checkRefs = () => {
      if (!videoRef.current || !canvasRef.current) {
        addDebugLog('⏳ Waiting for video/canvas elements...', 'info')
        setTimeout(checkRefs, 200)
        return
      }
      
      // Recheck scanning state
      if (!isScanning) {
        return
      }
      
      const hasVideo = !!videoRef.current
      const hasCanvas = !!canvasRef.current
      const videoReady = videoRef.current?.readyState
      const videoSize = videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'none'
      
      addDebugLog('🔍 Starting QR detection...', 'info')
      addDebugLog(`📊 Status: Video=${hasVideo}, Canvas=${hasCanvas}`, 'info')
      addDebugLog(`📐 Video size: ${videoSize}, ReadyState: ${videoReady}`, 'info')
      
      console.log('Starting QR detection loop', {
        isScanning,
        hasVideo,
        hasCanvas,
        videoReady,
        videoSize
      })
      
      let frameCount = 0
      let lastUpdateTime = Date.now()
      
      const scanLoop = () => {
        // Check if still scanning (use refs, not state to avoid stale closure)
        if (!isScanning || !videoRef.current || !canvasRef.current) {
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
          }
          return
        }
        
        frameCount++
        const now = Date.now()
        
        try {
          const video = videoRef.current
          const canvas = canvasRef.current

          // Update debug info every 1 second
          if (now - lastUpdateTime > 1000) {
            const videoReady = video.readyState === video.HAVE_ENOUGH_DATA ? 'Yes' : 'No'
            const videoSize = video.videoWidth > 0 && video.videoHeight > 0 
              ? `${video.videoWidth}x${video.videoHeight}` 
              : 'Not set'
            addDebugLog(`🔄 Frame ${frameCount} | Video: ${videoReady} | Size: ${videoSize}`, 'info')
            lastUpdateTime = now
          }

          // Check if video is ready
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            return
          }

          // Check if video has valid dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            return
          }

          const context = canvas.getContext('2d')
          
          // Always set canvas size to match video
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Get image data with size optimization for mobile
          const maxSize = 640 // 限制最大尺寸以提高性能
          let imageData, scanWidth, scanHeight
          
          if (canvas.width > maxSize || canvas.height > maxSize) {
            // 如果尺寸太大，进行缩放以提高性能
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height)
            scanWidth = Math.floor(canvas.width * scale)
            scanHeight = Math.floor(canvas.height * scale)
            
            // 创建临时canvas进行缩放
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = scanWidth
            tempCanvas.height = scanHeight
            const tempContext = tempCanvas.getContext('2d')
            tempContext.drawImage(video, 0, 0, scanWidth, scanHeight)
            imageData = tempContext.getImageData(0, 0, scanWidth, scanHeight)
          } else {
            // 使用原始尺寸
            scanWidth = canvas.width
            scanHeight = canvas.height
            imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          }
          
          // Try to detect QR code with inversionAttempts option
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          })

          if (code && code.data) {
            // Found a QR code!
            const codePreview = code.data.substring(0, 50) + (code.data.length > 50 ? '...' : '')
            addDebugLog(`✅ QR Code detected: ${codePreview}`, 'success')
            console.log('✅ QR code detected:', code.data.substring(0, 50) + '...')
            setScanAttempts(prev => prev + 1)
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            setScannedCode(code.data)
            stopScanning()
            verifyTicket(code.data)
          }
        } catch (err) {
          // Log errors but don't stop scanning
          console.error('Scan loop error:', err)
          if (frameCount % 25 === 0) {
            addDebugLog(`⚠️ Error: ${err.message || 'Unknown'}`, 'error')
          }
        }
      }

      // Start scanning every 200ms
      scanIntervalRef.current = setInterval(scanLoop, 200)
      console.log('✅ QR detection interval started, ID:', scanIntervalRef.current)
      
      // Run immediately
      scanLoop()
    }
    
    // Start checking for refs
    checkRefs()
    
    return () => {
      if (scanIntervalRef.current) {
        console.log('🧹 Cleaning up QR detection interval')
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [isScanning])

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
    setDebugInfo('')
    setScanAttempts(0)
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
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#94a3b8', 
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '500' }}>📱 Scanning Tips:</div>
                <div style={{ fontSize: '0.75rem', textAlign: 'left', paddingLeft: '8px', lineHeight: '1.6' }}>
                  • Ensure good lighting conditions<br/>
                  • Hold QR code steady in frame<br/>
                  • Keep camera 10-30cm from QR code<br/>
                  • Make sure entire QR code is visible
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    borderRadius: '8px',
                    display: 'block',
                    backgroundColor: '#000',
                    minHeight: '300px'
                  }}
                  playsInline
                  autoPlay
                  muted
                  onLoadedMetadata={() => {
                    console.log('Video metadata loaded', {
                      width: videoRef.current?.videoWidth,
                      height: videoRef.current?.videoHeight,
                      readyState: videoRef.current?.readyState
                    })
                    if (videoRef.current) {
                      videoRef.current.play().catch(err => {
                        console.error('Auto-play failed:', err)
                      })
                    }
                  }}
                  onPlay={() => {
                    console.log('Video started playing')
                    addDebugLog('▶️ Video started playing', 'success')
                    addDebugLog('🔍 Camera active. Scanning for QR codes...', 'info')
                  }}
                />
                {/* Scanning overlay indicator */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  🔍 Scanning...
                </div>
              </div>
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
          
          {/* Debug Panel */}
          {showDebug && (
            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              border: '1px solid #334155',
              padding: '16px',
              marginTop: '16px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Debug Information</h3>
                <button
                  onClick={() => setDebugInfo([])}
                  style={{
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#475569',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {debugInfo.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No debug information yet. Start scanning to see logs.</div>
                ) : (
                  debugInfo.map((log, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: log.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                         log.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                         'rgba(59, 130, 246, 0.1)',
                        borderRadius: '0.25rem',
                        borderLeft: `3px solid ${
                          log.type === 'error' ? '#ef4444' : 
                          log.type === 'success' ? '#10b981' : 
                          '#3b82f6'
                        }`
                      }}
                    >
                      <span style={{ color: '#94a3b8' }}>[{log.timestamp}]</span>{' '}
                      <span style={{ 
                        color: log.type === 'error' ? '#fca5a5' : 
                               log.type === 'success' ? '#6ee7b7' : 
                               '#bfdbfe'
                      }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
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

