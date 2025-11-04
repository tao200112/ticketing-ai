'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MerchantNavbar from '@/components/MerchantNavbar'
import jsQR from 'jsqr'

export default function MerchantScanPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [showDebug, setShowDebug] = useState(true)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)

  // 添加调试日志函数
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    console.log(`[${timestamp}] ${message}`)
    setDebugInfo(prev => [...prev.slice(-19), logEntry])
  }

  useEffect(() => {
    const checkMerchantAuth = () => {
      const token = localStorage.getItem('merchantToken')
      const user = localStorage.getItem('merchantUser')
      
      if (!token || !user) {
        router.push('/merchant/auth/login')
        return
      }
      
      const parsedUser = JSON.parse(user)
      const role = parsedUser.merchant_role || 'boss'
      setUserRole(role)
    }
    
    checkMerchantAuth()
    
    return () => {
      stopScanning()
    }
  }, [router])

  const startScanning = async () => {
    try {
      setError('')
      addDebugLog('🎥 Starting camera...', 'info')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser')
        addDebugLog('❌ Camera API not supported', 'error')
        return
      }

      setIsScanning(true)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      streamRef.current = stream
      
      let attempts = 0
      const maxAttempts = 20
      while (!videoRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (!videoRef.current) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
        streamRef.current = null
        setIsScanning(false)
        setError('Video element not initialized. Please refresh the page and try again.')
        return
      }
      
      const video = videoRef.current
      video.srcObject = stream
      
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
        
        const timeoutId = setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          reject(new Error('Video load timeout'))
        }, 5000)
      })
      
      await video.play()
      addDebugLog('✅ Video started, QR detection will begin automatically', 'success')
    } catch (err) {
      console.error('Camera error:', err)
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setIsScanning(false)
      addDebugLog(`❌ Failed to start camera: ${err.message || 'Unknown error'}`, 'error')
      
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
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
    if (!isScanning) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      return
    }
    
    const checkRefs = () => {
      if (!videoRef.current || !canvasRef.current) {
        addDebugLog('⏳ Waiting for video/canvas elements...', 'info')
        setTimeout(checkRefs, 200)
        return
      }
      
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
      
      let frameCount = 0
      let lastUpdateTime = Date.now()
      
      const scanLoop = () => {
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

          if (now - lastUpdateTime > 1000) {
            const videoReady = video.readyState === video.HAVE_ENOUGH_DATA ? 'Yes' : 'No'
            const videoSize = video.videoWidth > 0 && video.videoHeight > 0 
              ? `${video.videoWidth}x${video.videoHeight}` 
              : 'Not set'
            addDebugLog(`🔄 Frame ${frameCount} | Video: ${videoReady} | Size: ${videoSize}`, 'info')
            lastUpdateTime = now
          }

          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            return
          }

          if (video.videoWidth === 0 || video.videoHeight === 0) {
            return
          }

          const context = canvas.getContext('2d')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const maxSize = 640
          let imageData, scanWidth, scanHeight
          
          if (canvas.width > maxSize || canvas.height > maxSize) {
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height)
            scanWidth = Math.floor(canvas.width * scale)
            scanHeight = Math.floor(canvas.height * scale)
            
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = scanWidth
            tempCanvas.height = scanHeight
            const tempContext = tempCanvas.getContext('2d')
            tempContext.drawImage(video, 0, 0, scanWidth, scanHeight)
            imageData = tempContext.getImageData(0, 0, scanWidth, scanHeight)
          } else {
            scanWidth = canvas.width
            scanHeight = canvas.height
            imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          }
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          })

          if (code && code.data) {
            const codePreview = code.data.substring(0, 50) + (code.data.length > 50 ? '...' : '')
            addDebugLog(`✅ QR Code detected: ${codePreview}`, 'success')
            
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current)
              scanIntervalRef.current = null
            }
            stopScanning()
            // 清除之前的错误信息
            setError('')
            // 扫描成功后自动验证票务信息
            verifyTicket(code.data)
          }
        } catch (err) {
          console.error('Scan loop error:', err)
          if (frameCount % 25 === 0) {
            addDebugLog(`⚠️ Error: ${err.message || 'Unknown'}`, 'error')
          }
        }
      }

      scanIntervalRef.current = setInterval(scanLoop, 200)
      scanLoop()
    }
    
    checkRefs()
    
    return () => {
      if (scanIntervalRef.current) {
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
      
      // 先验证票务信息（不核销）
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
        
        // 检查票务状态
        const isUsed = ticket.status === 'used'
        const isRefunded = ticket.status === 'refunded'
        const isCancelled = ticket.status === 'cancelled'
        const isValid = validity?.valid && !isUsed && !isRefunded && !isCancelled
        
        // 显示票务信息（无论是否已使用）
        setScanResult({
          qr_data: qrData, // 保存二维码数据用于核销
          ticket_id: ticket.short_id || ticket.id,
          holder_name: ticket.holder_name || 'Unknown',
          holder_age: ticket.holder_age || null,
          tier: ticket.tier || 'N/A',
          status: ticket.status,
          event_name: event?.title || 'Unknown Event',
          event_venue: event?.venue_name || 'N/A',
          valid_from: validity?.validFrom || validity?.valid_from || null,
          valid_until: validity?.validUntil || validity?.valid_until || null,
          is_valid: isValid,
          is_used: isUsed,
          used_at: ticket.used_at || null,
          redeemed_at: ticket.redeemed_at || null,
          can_redeem: isValid && !isUsed && !isRefunded && !isCancelled
        })
        // 验证成功时清除之前的错误
        setError('')
        addDebugLog('✅ Ticket verified successfully', 'success')
      } else {
        const errorCode = verifyResult.error || verifyResult.code
        let errorMessage = verifyResult.message || 'Ticket verification failed'
        
        if (errorCode === 'INVALID_QR_FORMAT') {
          errorMessage = 'Invalid QR code format'
        } else if (errorCode === 'TICKET_NOT_FOUND') {
          errorMessage = 'Ticket not found in system'
        }
        
        setError(errorMessage)
        setScanResult(null)
        addDebugLog(`❌ Verification failed: ${errorMessage}`, 'error')
      }
    } catch (err) {
      setError(err.message || 'Ticket verification error, please try again')
      console.error('Verification error:', err)
      setScanResult(null)
    } finally {
      setLoading(false)
    }
  }

  const redeemTicket = async (qrData) => {
    try {
      setLoading(true)
      setError('')
      addDebugLog('🔄 Starting ticket redemption...', 'info')
      
      const merchantUserStr = localStorage.getItem('merchantUser')
      if (!merchantUserStr) {
        setError('Please login first')
        addDebugLog('❌ Not logged in', 'error')
        return
      }
      
      const merchantUser = JSON.parse(merchantUserStr)
      const userId = merchantUser.id
      
      addDebugLog(`📤 Sending redemption request for QR: ${qrData.substring(0, 30)}...`, 'info')
      
      // 核销票务
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
      addDebugLog(`📥 Redemption response: ${response.ok ? 'Success' : 'Failed'}`, response.ok ? 'success' : 'error')
      
      if (response.ok && result.success) {
        addDebugLog('✅ Ticket redeemed successfully!', 'success')
        // 核销成功后，重新获取票务信息（此时status应该是'used'）
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
          
          setScanResult({
            qr_data: qrData, // 保存二维码数据
            ticket_id: ticket.short_id || ticket.id,
            holder_name: ticket.holder_name || 'Unknown',
            holder_age: ticket.holder_age || null,
            tier: ticket.tier || 'N/A',
            status: ticket.status, // 应该是 'used'
            event_name: event?.title || 'Unknown Event',
            event_venue: event?.venue_name || 'N/A',
            valid_from: validity?.validFrom || validity?.valid_from || null,
            valid_until: validity?.validUntil || validity?.valid_until || null,
            is_valid: false,
            is_used: true, // 已使用
            used_at: ticket.used_at || result.data?.redeemed_at || new Date().toISOString(),
            redeemed_at: ticket.redeemed_at || result.data?.redeemed_at || new Date().toISOString(),
            can_redeem: false
          })
          addDebugLog(`✅ Ticket status updated: ${ticket.status}`, 'success')
        }
        setError('')
      } else {
        const errorCode = result.error || result.code
        let errorMessage = result.message || 'Ticket redemption failed'
        
        if (errorCode === 'TICKET_ALREADY_USED') {
          errorMessage = 'Ticket has already been redeemed'
        } else if (errorCode === 'NOT_YOUR_MERCHANT_TICKET') {
          errorMessage = 'This ticket does not belong to your merchant'
        } else if (errorCode === 'TICKET_CANNOT_BE_REDEEMED') {
          errorMessage = 'Cannot redeem a cancelled or refunded ticket'
        }
        
        setError(errorMessage)
        addDebugLog(`❌ Redemption failed: ${errorMessage}`, 'error')
      }
    } catch (err) {
      const errorMsg = err.message || 'Ticket redemption error, please try again'
      setError(errorMsg)
      addDebugLog(`❌ Redemption error: ${errorMsg}`, 'error')
      console.error('Redemption error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setError('')
    setDebugInfo([])
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
          Ticket Scanner
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
              {/* Debug Toggle Button */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                  marginTop: '16px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: showDebug ? '#2563eb' : 'rgba(59, 130, 246, 0.2)',
                  color: showDebug ? 'white' : '#bfdbfe',
                  border: showDebug ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {showDebug ? '🔽 Hide Debug' : '▶️ Show Debug'}
              </button>
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
                    if (videoRef.current) {
                      videoRef.current.play().catch(err => {
                        console.error('Auto-play failed:', err)
                      })
                    }
                  }}
                  onPlay={() => {
                    addDebugLog('▶️ Video started playing', 'success')
                    addDebugLog('🔍 Camera active. Scanning for QR codes...', 'info')
                  }}
                />
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
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                Stop Scanning
              </button>
              
              {/* Debug Toggle Button */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: showDebug ? '#2563eb' : 'rgba(59, 130, 246, 0.2)',
                  color: showDebug ? 'white' : '#bfdbfe',
                  border: showDebug ? 'none' : '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {showDebug ? '🔽 Hide Debug' : '▶️ Show Debug'}
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
              Ticket Information
            </h2>
            
            {/* Ticket Status */}
            <div style={{
              backgroundColor: scanResult.is_used 
                ? 'rgba(239, 68, 68, 0.1)' 
                : scanResult.is_valid 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(234, 179, 8, 0.1)',
              border: `1px solid ${scanResult.is_used ? '#ef4444' : scanResult.is_valid ? '#10b981' : '#eab308'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                color: scanResult.is_used ? '#ef4444' : scanResult.is_valid ? '#10b981' : '#eab308',
                fontWeight: '600',
                marginBottom: '8px',
                fontSize: '1rem'
              }}>
                {scanResult.is_used ? '✗ Ticket Already Redeemed' : scanResult.is_valid ? '✓ Ticket Valid' : '⚠️ Ticket Invalid'}
              </div>
              {scanResult.is_used && scanResult.used_at && (
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                  Redeemed At: {new Date(scanResult.used_at).toLocaleString()}
                </div>
              )}
            </div>

            {/* Ticket Details */}
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '12px', fontWeight: '500' }}>
                Ticket Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Ticket ID:</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.ticket_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Holder Name:</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.holder_name}</span>
                </div>
                {scanResult.holder_age && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Age:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.holder_age}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Tier:</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.tier}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Event:</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.event_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Venue:</span>
                  <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.event_venue}</span>
                </div>
                {scanResult.valid_from && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Valid From:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                      {new Date(scanResult.valid_from).toLocaleString()}
                    </span>
                  </div>
                )}
                {scanResult.valid_until && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Valid Until:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                      {new Date(scanResult.valid_until).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {scanResult.can_redeem && (
                <button
                  onClick={async () => {
                    // 获取扫描的二维码数据
                    const qrData = scanResult.qr_data
                    if (qrData) {
                      await redeemTicket(qrData)
                    } else {
                      setError('Cannot redeem: QR code data not available. Please scan again.')
                      console.error('QR data missing:', scanResult)
                    }
                  }}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: loading ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'scale(1.02)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  {loading ? 'Processing...' : 'Redeem Ticket'}
                </button>
              )}
              <button
                onClick={resetScanner}
                style={{
                  flex: scanResult.can_redeem ? 1 : 1,
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
          </div>
        )}
      </div>
    </div>
  )
}