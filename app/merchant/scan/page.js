'use client'
export const dynamic = 'force-dynamic'

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
  const [showDebug, setShowDebug] = useState(false) // 默认隐藏调试面板
  
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
      
      const merchantUser = JSON.parse(merchantUserStr)
      
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
          
          // Debug: Log received ticket data
          console.log('🔍 Ticket verification response:', {
            holder_name: ticket.holder_name,
            holder_age: ticket.holder_age,
            full_ticket: ticket
          })
          addDebugLog(`📋 Ticket holder_name: ${ticket.holder_name || 'NULL'}, holder_age: ${ticket.holder_age ?? 'NULL'}`, 'info')
          
          // 检查商家权限（检查票务是否属于当前商家）
        let isOwnMerchantTicket = true
        let merchantError = null
        
        if (event?.merchant_id) {
          // 检查当前用户是否是该商家的成员或拥有者
          const merchantId = event.merchant_id
          const currentMerchantId = merchantUser.merchant_id || merchantUser.merchantId
          
          // 如果当前用户有merchant_id，检查是否匹配
          if (currentMerchantId && currentMerchantId !== merchantId) {
            isOwnMerchantTicket = false
            merchantError = 'This ticket belongs to another merchant. You do not have permission to redeem it.'
          }
        }
        
        // 检查票务状态
        const isUsed = ticket.status === 'used'
        const isRefunded = ticket.status === 'refunded'
        const isCancelled = ticket.status === 'cancelled'
        
        // 检查有效期
        const isExpired = validity?.status === 'expired'
        const isNotYetValid = validity?.status === 'not_yet_valid'
        
        // 综合判断是否有效
        const isValid = validity?.valid && !isUsed && !isRefunded && !isCancelled && isOwnMerchantTicket && !isExpired && !isNotYetValid
        
        // 生成错误原因
        let errorReason = null
                 if (!isOwnMerchantTicket) {
           errorReason = 'This ticket belongs to another merchant'
         } else if (isUsed) {
           errorReason = 'This ticket has already been redeemed'
         } else if (isRefunded || isCancelled) {
           errorReason = `This ticket has been ${isRefunded ? 'refunded' : 'cancelled'}`
         } else if (isExpired) {
           errorReason = 'This ticket has expired'
         } else if (isNotYetValid) {
           errorReason = 'This ticket is not yet valid'
         }
        
        // 显示票务信息（无论是否有效，都显示详细信息）
        setScanResult({
          qr_data: qrData, // 保存二维码数据用于核销
          ticket_id: ticket.short_id || ticket.id,
          holder_name: ticket.holder_name || 'Unknown',
          holder_age: ticket.holder_age || null,
          tier: ticket.tier || 'N/A',
          status: ticket.status,
          event_name: event?.title || 'Unknown Event',
          event_venue: event?.venue_name || 'N/A',
          valid_from: validity?.validFrom || validity?.valid_from || ticket.validity_start_time || null,
          valid_until: validity?.validUntil || validity?.valid_until || ticket.validity_end_time || null,
          is_valid: isValid,
          is_used: isUsed,
          used_at: ticket.used_at || null,
          redeemed_at: ticket.redeemed_at || null,
          can_redeem: isValid && !isUsed && !isRefunded && !isCancelled && isOwnMerchantTicket,
          error_reason: errorReason,
          validity_message: validity?.message || null
        })
        
        // 如果有错误原因，显示错误信息
        if (errorReason) {
          setError(errorReason)
          addDebugLog(`⚠️ Ticket verification: ${errorReason}`, 'error')
        } else {
          setError('')
          addDebugLog('✅ Ticket verified successfully - Ready to redeem', 'success')
        }
      } else {
        const errorCode = verifyResult.error || verifyResult.code
        let errorMessage = verifyResult.message || 'Ticket verification failed'
        
                  if (errorCode === 'INVALID_QR_FORMAT') {
            errorMessage = 'Invalid QR code format'
          } else if (errorCode === 'TICKET_NOT_FOUND') {
            errorMessage = 'Ticket not found'
          }
        
        setError(errorMessage)
        setScanResult(null)
        addDebugLog(`❌ Verification failed: ${errorMessage}`, 'error')
      }
    } catch (err) {
              setError(err.message || 'Ticket verification error, please try again')
      console.error('Verification error:', err)
      setScanResult(null)
      addDebugLog(`❌ Verification error: ${err.message}`, 'error')
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
          
          // Debug: Log received ticket data after redemption
          console.log('🔍 Ticket data after redemption:', {
            holder_name: ticket.holder_name,
            holder_age: ticket.holder_age,
            full_ticket: ticket
          })
          addDebugLog(`📋 After redemption - holder_name: ${ticket.holder_name || 'NULL'}, holder_age: ${ticket.holder_age ?? 'NULL'}`, 'info')
          
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
                {scanResult.is_used ? '❌ Ticket Already Redeemed' : scanResult.is_valid ? '✅ Ticket Valid' : '⚠️ Ticket Invalid'}
              </div>
              {scanResult.error_reason && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '8px', fontWeight: '500' }}>
                  {scanResult.error_reason}
                </div>
              )}
              {scanResult.validity_message && !scanResult.is_valid && (
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                  {scanResult.validity_message}
                </div>
              )}
              {scanResult.is_used && scanResult.used_at && (
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                                     Redeemed Time: {new Date(scanResult.used_at).toLocaleString('en-US')}
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
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.holder_name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Age:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.holder_age !== null && scanResult.holder_age !== undefined ? scanResult.holder_age : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Ticket Type:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.tier || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Event Name:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.event_name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Venue:</span>
                    <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>{scanResult.event_venue || 'N/A'}</span>
                  </div>
                {scanResult.valid_from && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                         <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Valid From:</span>
                     <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                       {new Date(scanResult.valid_from).toLocaleString('en-US')}
                     </span>
                   </div>
                 )}
                 {scanResult.valid_until && (
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Valid Until:</span>
                     <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
                       {new Date(scanResult.valid_until).toLocaleString('en-US')}
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





